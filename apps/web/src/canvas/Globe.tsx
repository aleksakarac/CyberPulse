'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
import GeoJsonGeometry from 'three-geojson-geometry'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { vector3ToLatLon } from '@/lib/geoUtils'
import { useAttackStore } from '@/lib/attackStore'

const GLOBE_RADIUS = 1

// Simple reverse geocode: given lat/lon, find nearest country from our known list
const COUNTRY_CENTROIDS: [string, number, number][] = [
  ['CN', 35.86, 104.2], ['RU', 61.52, 105.32], ['US', 37.09, -95.71],
  ['BR', -14.24, -51.93], ['IN', 20.59, 78.96], ['DE', 51.17, 10.45],
  ['GB', 55.38, -3.44], ['JP', 36.2, 138.25], ['FR', 46.23, 2.21],
  ['KR', 35.91, 127.77], ['NL', 52.13, 5.29], ['UA', 48.38, 31.17],
  ['IR', 32.43, 53.69], ['VN', 14.06, 108.28], ['AU', -25.27, 133.78],
  ['CA', 56.13, -106.35], ['SG', 1.35, 103.82], ['ZA', -30.56, 22.94],
  ['AR', -38.42, -63.62], ['NG', 9.08, 8.68],
]

function findNearestCountry(lat: number, lon: number): string | null {
  let closest = ''
  let minDist = Infinity
  for (const [code, clat, clon] of COUNTRY_CENTROIDS) {
    const d = Math.sqrt((lat - clat) ** 2 + (lon - clon) ** 2)
    if (d < minDist) {
      minDist = d
      closest = code
    }
  }
  return minDist < 30 ? closest : null
}

export default function Globe() {
  const groupRef = useRef<THREE.Group>(null)
  const [countryLines, setCountryLines] = useState<THREE.BufferGeometry | null>(null)
  const setSelectedCountry = useAttackStore((s) => s.setSelectedCountry)

  useEffect(() => {
    fetch('/geo/countries-110m.json')
      .then((res) => res.json())
      .then((topology: Topology) => {
        const countries = topojson.feature(
          topology,
          topology.objects.countries as GeometryCollection
        )

        const geometries: THREE.BufferGeometry[] = []
        for (const feature of countries.features) {
          if (feature.geometry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const geo = new GeoJsonGeometry(feature.geometry as any, GLOBE_RADIUS, 2)
            geometries.push(geo)
          }
        }

        if (geometries.length > 0) {
          const merged = mergeBufferGeometries(geometries)
          if (merged) setCountryLines(merged)
          geometries.forEach((g) => g.dispose())
        }
      })
  }, [])

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const point = event.point
      const { lat, lon } = vector3ToLatLon(point)
      const country = findNearestCountry(lat, lon)
      setSelectedCountry(country)
    },
    [setSelectedCountry]
  )

  return (
    <group ref={groupRef}>
      <mesh onClick={handleClick}>
        <icosahedronGeometry args={[GLOBE_RADIUS, 48]} />
        <meshStandardMaterial
          color="#0a0e17"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {countryLines && (
        <lineSegments geometry={countryLines}>
          <lineBasicMaterial
            color="#1a4a7a"
            transparent
            opacity={0.5}
            depthTest={true}
          />
        </lineSegments>
      )}
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
      const arr = pos.array as Float32Array
      mergedPositions.set(arr, offset)
      offset += arr.length
    }
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3))
  return merged
}
