'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { GeoPermissibleObjects } from 'd3-geo'
import { geoInterpolate } from 'd3-geo'
import earcut from 'earcut'
import { latLonToVector3 } from '@/lib/geoUtils'
import { useAttackStore } from '@/lib/attackStore'

const GLOBE_RADIUS = 1

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
        const v1 = latLonToVector3(p1[1], p1[0], radius)
        const v2 = latLonToVector3(p2[1], p2[0], radius)
        verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
      } else {
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

/* ─── GPU Color Picking helpers ─── */

/**
 * Triangulate a single polygon (with optional holes) and return 3D vertex positions.
 * Uses earcut for 2D triangulation in lon/lat space, then maps to sphere.
 */
function triangulatePolygon(coordinates: number[][][], radius: number): Float32Array | null {
  const outerRing = coordinates[0]
  if (!outerRing || outerRing.length < 3) return null

  const flatCoords: number[] = []
  const holeIndices: number[] = []

  // Helper: check if last point duplicates first (GeoJSON convention)
  const ringLength = (ring: number[][]) => {
    const last = ring[ring.length - 1]
    const first = ring[0]
    return last[0] === first[0] && last[1] === first[1]
      ? ring.length - 1
      : ring.length
  }

  // Outer ring
  const outerLen = ringLength(outerRing)
  for (let i = 0; i < outerLen; i++) {
    flatCoords.push(outerRing[i][0], outerRing[i][1])
  }

  // Hole rings
  for (let h = 1; h < coordinates.length; h++) {
    const hole = coordinates[h]
    holeIndices.push(flatCoords.length / 2)
    const holeLen = ringLength(hole)
    for (let i = 0; i < holeLen; i++) {
      flatCoords.push(hole[i][0], hole[i][1])
    }
  }

  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2)
  if (indices.length === 0) return null

  const positions = new Float32Array(indices.length * 3)
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i]
    const lon = flatCoords[idx * 2]
    const lat = flatCoords[idx * 2 + 1]
    const v = latLonToVector3(lat, lon, radius)
    positions[i * 3] = v.x
    positions[i * 3 + 1] = v.y
    positions[i * 3 + 2] = v.z
  }

  return positions
}

/**
 * Create a filled mesh for a country feature used in the GPU pick scene.
 */
function createPickMesh(
  geometry: GeoPermissibleObjects,
  color: THREE.Color,
  radius: number,
): THREE.Mesh | null {
  const chunks: Float32Array[] = []
  let totalVerts = 0

  if (geometry.type === 'Polygon') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos = triangulatePolygon((geometry as any).coordinates, radius)
    if (pos) { chunks.push(pos); totalVerts += pos.length / 3 }
  } else if (geometry.type === 'MultiPolygon') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const polygon of (geometry as any).coordinates) {
      const pos = triangulatePolygon(polygon, radius)
      if (pos) { chunks.push(pos); totalVerts += pos.length / 3 }
    }
  }

  if (totalVerts === 0) return null

  const merged = new Float32Array(totalVerts * 3)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(merged, 3))

  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  )
}

/** Encode a country index (0-based) as an RGB color. Index -1 / black = no country. */
function encodeIndex(index: number): THREE.Color {
  const id = index + 1
  return new THREE.Color(
    ((id >> 16) & 0xff) / 255,
    ((id >> 8) & 0xff) / 255,
    (id & 0xff) / 255,
  )
}

/** Decode an RGB pixel back to a country index. Returns -1 for black (no country). */
function decodePixel(r: number, g: number, b: number): number {
  if (r === 0 && g === 0 && b === 0) return -1
  return ((r << 16) | (g << 8) | b) - 1
}

/* ─── Component ─── */

export default function Globe() {
  const { gl, camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const highlightRef = useRef<THREE.LineSegments | null>(null)

  // GPU picker state
  const pickSceneRef = useRef<THREE.Scene | null>(null)
  const pickTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const highlightGeoRef = useRef<Map<number, THREE.BufferGeometry>>(new Map())
  const featureIdsRef = useRef<string[]>([])
  const hoveredIndexRef = useRef(-1)
  const mouseRef = useRef({ x: -1, y: -1 })
  const pickReadyRef = useRef(false)
  const pixelBuf = useRef(new Uint8Array(4))

  const setSelectedCountry = useAttackStore((s) => s.setSelectedCountry)

  // ── DOM event listeners for mouse tracking & clicks ──
  useEffect(() => {
    const canvas = gl.domElement
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) * window.devicePixelRatio
      mouseRef.current.y = (e.clientY - rect.top) * window.devicePixelRatio
    }
    const onLeave = () => {
      mouseRef.current.x = -1
      mouseRef.current.y = -1
    }
    const onClick = () => {
      const idx = hoveredIndexRef.current
      if (idx >= 0) {
        const featureId = featureIdsRef.current[idx]
        setSelectedCountry(NUM_TO_ALPHA2[featureId] ?? null)
      } else {
        setSelectedCountry(null)
      }
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [gl, setSelectedCountry])

  // ── Load topology → build borders, highlight geos, pick scene ──
  useEffect(() => {
    fetch('/geo/countries-110m.json')
      .then((res) => res.json())
      .then((topology: Topology) => {
        if (!groupRef.current) return

        // 1. All-borders line geometry (topojson.mesh → clean MultiLineString)
        const bordersMesh = topojson.mesh(
          topology,
          topology.objects.countries as GeometryCollection,
        )
        groupRef.current.add(
          new THREE.LineSegments(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ringsToLineSegments((bordersMesh as any).coordinates, GLOBE_RADIUS),
            new THREE.LineBasicMaterial({ color: '#1e5a9a', transparent: true, opacity: 0.6 }),
          ),
        )

        // 2. Per-country features
        const countries = topojson.feature(
          topology,
          topology.objects.countries as GeometryCollection,
        )

        const highlightGeos = new Map<number, THREE.BufferGeometry>()
        const featureIds: string[] = []
        const pickScene = new THREE.Scene()
        pickScene.background = new THREE.Color(0x000000)

        for (const feature of countries.features) {
          if (!feature.geometry) continue
          const index = featureIds.length
          featureIds.push(String(feature.id))

          // Highlight geometry (line borders for hover glow)
          const rings = extractRings(feature.geometry as GeoPermissibleObjects)
          if (rings.length > 0) {
            highlightGeos.set(index, ringsToLineSegments(rings, GLOBE_RADIUS * 1.003))
          }

          // Pick mesh (filled triangulated polygon with unique ID color)
          const mesh = createPickMesh(
            feature.geometry as GeoPermissibleObjects,
            encodeIndex(index),
            GLOBE_RADIUS,
          )
          if (mesh) pickScene.add(mesh)
        }

        highlightGeoRef.current = highlightGeos
        featureIdsRef.current = featureIds
        pickSceneRef.current = pickScene
        pickTargetRef.current = new THREE.WebGLRenderTarget(1, 1, {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
        })

        // Highlight mesh (reused — geometry swapped on hover)
        const highlight = new THREE.LineSegments(new THREE.BufferGeometry(), highlightMaterial)
        highlight.visible = false
        highlight.renderOrder = 1
        groupRef.current.add(highlight)
        highlightRef.current = highlight

        pickReadyRef.current = true
      })
      .catch((err) => console.error('Failed to load country data:', err))
  }, [])

  // ── Per-frame: GPU pick + highlight update ──
  useFrame(() => {
    if (!pickReadyRef.current) return

    const { x, y } = mouseRef.current
    const w = gl.domElement.width
    const h = gl.domElement.height
    const highlight = highlightRef.current

    // Mouse outside canvas → clear hover
    if (x < 0 || y < 0 || x >= w || y >= h) {
      hoveredIndexRef.current = -1
      if (highlight) highlight.visible = false
      gl.domElement.style.cursor = ''
      return
    }

    const pickScene = pickSceneRef.current!
    const pickTarget = pickTargetRef.current!
    const cam = camera as THREE.PerspectiveCamera

    // Render just the 1×1 pixel under the mouse
    cam.setViewOffset(w, h, Math.floor(x), Math.floor(y), 1, 1)
    const prevAutoClear = gl.autoClear
    gl.autoClear = true
    gl.setRenderTarget(pickTarget)
    gl.render(pickScene, cam)
    gl.setRenderTarget(null)
    gl.autoClear = prevAutoClear
    cam.clearViewOffset()

    // Read the pixel
    gl.readRenderTargetPixels(pickTarget, 0, 0, 1, 1, pixelBuf.current)
    const idx = decodePixel(pixelBuf.current[0], pixelBuf.current[1], pixelBuf.current[2])
    hoveredIndexRef.current = idx

    // Update cursor
    gl.domElement.style.cursor = idx >= 0 ? 'pointer' : ''

    // Update highlight
    if (!highlight) return
    if (idx < 0) {
      highlight.visible = false
      return
    }
    const geo = highlightGeoRef.current.get(idx)
    if (geo && highlight.geometry !== geo) highlight.geometry = geo
    highlight.visible = !!geo
  })

  return (
    <group ref={groupRef}>
      {/* Visual globe */}
      <mesh raycast={() => null}>
        <icosahedronGeometry args={[GLOBE_RADIUS, 48]} />
        <meshStandardMaterial color="#0a0e17" roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  )
}
