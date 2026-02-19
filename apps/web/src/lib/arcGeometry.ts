import * as THREE from 'three'
import { latLonToVector3 } from './geoUtils'

const GLOBE_RADIUS = 1

/**
 * Create a quadratic bezier curve arc between two lat/lon points on the globe.
 * The midpoint is raised above the surface proportional to the great-circle distance.
 */
export function createArcCurve(
  srcLat: number,
  srcLon: number,
  tgtLat: number,
  tgtLon: number
): THREE.QuadraticBezierCurve3 {
  const start = latLonToVector3(srcLat, srcLon, GLOBE_RADIUS)
  const end = latLonToVector3(tgtLat, tgtLon, GLOBE_RADIUS)

  // Calculate great-circle distance (normalized 0-1 for half globe)
  const distance = start.distanceTo(end)

  // Midpoint between start and end, raised above the surface
  const mid = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5)

  // Raise the midpoint above the globe surface
  const midLength = mid.length()
  if (midLength > 0.001) {
    const arcHeight = GLOBE_RADIUS + 0.15 + distance * 0.3
    mid.normalize().multiplyScalar(arcHeight)
  }

  return new THREE.QuadraticBezierCurve3(start, mid, end)
}

/**
 * Generate points along an arc curve for rendering.
 */
export function getArcPoints(
  curve: THREE.QuadraticBezierCurve3,
  segments: number = 64
): Float32Array {
  const points = curve.getPoints(segments)
  const positions = new Float32Array(points.length * 3)

  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i].x
    positions[i * 3 + 1] = points[i].y
    positions[i * 3 + 2] = points[i].z
  }

  return positions
}
