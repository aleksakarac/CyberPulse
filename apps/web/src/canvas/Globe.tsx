'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import GeoJsonGeometry from 'three-geojson-geometry'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'

const GLOBE_RADIUS = 1

export default function Globe() {
  const groupRef = useRef<THREE.Group>(null)
  const [countryLines, setCountryLines] = useState<THREE.BufferGeometry | null>(
    null
  )

  useEffect(() => {
    fetch('/geo/countries-110m.json')
      .then((res) => res.json())
      .then((topology: Topology) => {
        const countries = topojson.feature(
          topology,
          topology.objects.countries as GeometryCollection
        )

        // Merge all country geometries into one LineSegments geometry
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
          // Dispose individual geometries
          geometries.forEach((g) => g.dispose())
        }
      })
  }, [])

  return (
    <group ref={groupRef}>
      {/* Globe sphere */}
      <mesh>
        <icosahedronGeometry args={[GLOBE_RADIUS, 48]} />
        <meshStandardMaterial
          color="#0a0e17"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Country borders */}
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

/**
 * Merge multiple buffer geometries into one.
 */
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
  merged.setAttribute(
    'position',
    new THREE.BufferAttribute(mergedPositions, 3)
  )
  return merged
}
