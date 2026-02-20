'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import GeoJsonGeometry from 'three-geojson-geometry'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { geoContains } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import { vector3ToLatLon } from '@/lib/geoUtils'
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

export default function Globe() {
  const groupRef = useRef<THREE.Group>(null)
  const highlightRef = useRef<THREE.LineSegments | null>(null)
  const countryGeoMapRef = useRef<Map<string, THREE.BufferGeometry>>(new Map())
  const countryFeaturesRef = useRef<CountryFeature[]>([])
  const hoveredCountryRef = useRef<string | null>(null)
  const setSelectedCountry = useAttackStore((s) => s.setSelectedCountry)

  // Load country geometries
  useEffect(() => {
    fetch('/geo/countries-110m.json')
      .then((res) => res.json())
      .then((topology: Topology) => {
        const countries = topojson.feature(
          topology,
          topology.objects.countries as GeometryCollection
        )

        const allGeometries: THREE.BufferGeometry[] = []
        const perCountry = new Map<string, THREE.BufferGeometry>()
        const features: CountryFeature[] = []

        for (const feature of countries.features) {
          if (!feature.geometry) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const geo = new GeoJsonGeometry(feature.geometry as any, GLOBE_RADIUS, 2)
          allGeometries.push(geo)

          const alpha2 = NUM_TO_ALPHA2[String(feature.id)]
          if (alpha2) {
            // Slightly larger radius for hover so it renders above base borders
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hoverGeo = new GeoJsonGeometry(feature.geometry as any, GLOBE_RADIUS * 1.003, 2)
            perCountry.set(alpha2, hoverGeo)
            features.push({ alpha2, geometry: feature.geometry as GeoPermissibleObjects })
          }
        }

        countryGeoMapRef.current = perCountry
        countryFeaturesRef.current = features

        if (allGeometries.length > 0 && groupRef.current) {
          const merged = mergeBufferGeometries(allGeometries)
          if (merged) {
            groupRef.current.add(new THREE.LineSegments(
              merged,
              new THREE.LineBasicMaterial({ color: '#1e5a9a', transparent: true, opacity: 0.6 })
            ))
          }
          allGeometries.forEach((g) => g.dispose())
        }

        // Create highlight mesh (initially invisible)
        if (groupRef.current) {
          const highlight = new THREE.LineSegments(new THREE.BufferGeometry(), highlightMaterial)
          highlight.visible = false
          highlight.renderOrder = 1
          groupRef.current.add(highlight)
          highlightRef.current = highlight
        }
      })
      .catch((err) => console.error('Failed to load country borders:', err))
  }, [])

  const findCountryAtPoint = useCallback((lat: number, lon: number): string | null => {
    for (const { alpha2, geometry } of countryFeaturesRef.current) {
      if (geoContains(geometry, [lon, lat])) return alpha2
    }
    return null
  }, [])

  // Update highlight visual in render loop (imperative, no React re-renders)
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
      {/* Visual globe — high detail, no pointer events */}
      <mesh raycast={() => null}>
        <icosahedronGeometry args={[GLOBE_RADIUS, 48]} />
        <meshStandardMaterial color="#0a0e17" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Hit-test sphere — low poly, fully transparent but still raycastable */}
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

function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry | null {
  let totalVertices = 0
  for (const geo of geometries) {
    const pos = geo.getAttribute('position')
    if (pos) totalVertices += pos.count
  }
  if (totalVertices === 0) return null

  const mergedPositions = new Float32Array(totalVertices * 3)
  let offset = 0
  for (const geo of geometries) {
    const pos = geo.getAttribute('position')
    if (pos) {
      mergedPositions.set(pos.array as Float32Array, offset)
      offset += pos.array.length
    }
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3))
  return merged
}
