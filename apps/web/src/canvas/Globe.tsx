'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { geoContains, geoInterpolate } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import { latLonToVector3, vector3ToLatLon } from '@/lib/geoUtils'
import { useAttackStore } from '@/lib/attackStore'

const GLOBE_RADIUS = 1

type CountryFeature = {
  alpha2: string
  geometry: GeoPermissibleObjects
}

const NUM_TO_ALPHA2: Record<string, string> = {
  '156': 'CN', '643': 'RU', '840': 'US', '076': 'BR', '356': 'IN',
  '276': 'DE', '826': 'GB', '392': 'JP', '250': 'FR', '410': 'KR',
  '528': 'NL', '804': 'UA', '364': 'IR', '704': 'VN', '036': 'AU',
  '124': 'CA', '702': 'SG', '710': 'ZA', '032': 'AR', '566': 'NG',
}

const highlightMaterial = new THREE.LineBasicMaterial({
  color: '#ff9f43',
  transparent: true,
  opacity: 0.95,
  depthTest: false,
})

/** Max degrees between points before we subdivide with great circle interpolation */
const MAX_SEGMENT_DEG = 2

/**
 * Convert an array of [lon, lat] coordinate rings into LineSegments geometry.
 * Long segments are subdivided along great circle arcs so they follow the sphere surface.
 */
function ringsToLineSegments(rings: number[][][], radius: number): THREE.BufferGeometry {
  const verts: number[] = []
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i]
      const p2 = ring[i + 1]
      const dlon = Math.abs(p2[0] - p1[0])
      const dlat = Math.abs(p2[1] - p1[1])
      const dist = Math.sqrt(dlon * dlon + dlat * dlat)

      if (dist <= MAX_SEGMENT_DEG) {
        // Short segment — draw directly
        const v1 = latLonToVector3(p1[1], p1[0], radius)
        const v2 = latLonToVector3(p2[1], p2[0], radius)
        verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
      } else {
        // Long segment — subdivide along great circle
        const steps = Math.ceil(dist / MAX_SEGMENT_DEG)
        const interp = geoInterpolate(p1 as [number, number], p2 as [number, number])
        for (let s = 0; s < steps; s++) {
          const a = interp(s / steps)
          const b = interp((s + 1) / steps)
          const v1 = latLonToVector3(a[1], a[0], radius)
          const v2 = latLonToVector3(b[1], b[0], radius)
          verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  return geo
}

/**
 * Extract all coordinate rings from a Polygon or MultiPolygon geometry.
 */
function extractRings(geometry: GeoPermissibleObjects): number[][][] {
  const rings: number[][][] = []
  if (geometry.type === 'Polygon') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const ring of (geometry as any).coordinates) {
      rings.push(ring)
    }
  } else if (geometry.type === 'MultiPolygon') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const polygon of (geometry as any).coordinates) {
      for (const ring of polygon) {
        rings.push(ring)
      }
    }
  }
  return rings
}

export default function Globe() {
  const groupRef = useRef<THREE.Group>(null)
  const highlightRef = useRef<THREE.LineSegments | null>(null)
  const countryGeoMapRef = useRef<Map<string, THREE.BufferGeometry>>(new Map())
  const countryFeaturesRef = useRef<CountryFeature[]>([])
  const hoveredCountryRef = useRef<string | null>(null)
  const setSelectedCountry = useAttackStore((s) => s.setSelectedCountry)

  useEffect(() => {
    fetch('/geo/countries-110m.json')
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (!groupRef.current) return

        // Build all-borders geometry using topojson.mesh (gives clean MultiLineString)
        const bordersMesh = topojson.mesh(
          topology,
          topology.objects.countries as GeometryCollection
        )
        // bordersMesh.type === 'MultiLineString'
        // bordersMesh.coordinates is an array of line strings
        const borderGeo = ringsToLineSegments(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (bordersMesh as any).coordinates,
          GLOBE_RADIUS
        )
        groupRef.current.add(new THREE.LineSegments(
          borderGeo,
          new THREE.LineBasicMaterial({ color: '#1e5a9a', transparent: true, opacity: 0.6 })
        ))

        // Build per-country features for hover detection + highlight geometry
        const countries = topojson.feature(
          topology,
          topology.objects.countries as GeometryCollection
        )
        const perCountry = new Map<string, THREE.BufferGeometry>()
        const features: CountryFeature[] = []

        for (const feature of countries.features) {
          if (!feature.geometry) continue
          const alpha2 = NUM_TO_ALPHA2[String(feature.id)]
          if (!alpha2) continue

          features.push({ alpha2, geometry: feature.geometry as GeoPermissibleObjects })

          // Build hover highlight geometry from polygon rings
          const rings = extractRings(feature.geometry as GeoPermissibleObjects)
          if (rings.length > 0) {
            perCountry.set(alpha2, ringsToLineSegments(rings, GLOBE_RADIUS * 1.003))
          }
        }

        countryGeoMapRef.current = perCountry
        countryFeaturesRef.current = features

        // Create highlight mesh (initially invisible)
        const highlight = new THREE.LineSegments(new THREE.BufferGeometry(), highlightMaterial)
        highlight.visible = false
        highlight.renderOrder = 1
        groupRef.current.add(highlight)
        highlightRef.current = highlight
      })
      .catch((err) => console.error('Failed to load country borders:', err))
  }, [])

  const findCountryAtPoint = useCallback((lat: number, lon: number): string | null => {
    for (const { alpha2, geometry } of countryFeaturesRef.current) {
      if (geoContains(geometry, [lon, lat])) return alpha2
    }
    return null
  }, [])

  useFrame(() => {
    const highlight = highlightRef.current
    if (!highlight) return
    const country = hoveredCountryRef.current
    if (!country) {
      highlight.visible = false
      return
    }
    const geo = countryGeoMapRef.current.get(country)
    if (geo && highlight.geometry !== geo) highlight.geometry = geo
    highlight.visible = !!geo
  })

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const { lat, lon } = vector3ToLatLon(event.point)
      hoveredCountryRef.current = findCountryAtPoint(lat, lon)
    },
    [findCountryAtPoint]
  )

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const { lat, lon } = vector3ToLatLon(event.point)
      setSelectedCountry(findCountryAtPoint(lat, lon))
    },
    [setSelectedCountry, findCountryAtPoint]
  )

  const handlePointerLeave = useCallback(() => {
    hoveredCountryRef.current = null
  }, [])

  return (
    <group ref={groupRef}>
      {/* Visual globe */}
      <mesh raycast={() => null}>
        <icosahedronGeometry args={[GLOBE_RADIUS, 48]} />
        <meshStandardMaterial color="#0a0e17" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Hit-test sphere — low poly, transparent, handles pointer events */}
      <mesh
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[GLOBE_RADIUS, 32, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
