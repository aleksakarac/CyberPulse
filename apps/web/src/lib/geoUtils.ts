import * as THREE from 'three'

const DEG2RAD = Math.PI / 180

/**
 * Convert latitude/longitude to 3D position on a sphere.
 * Matches the convention used by three-geojson-geometry:
 *   phi   = (90 - lat) * DEG2RAD
 *   theta = (90 - lon) * DEG2RAD
 *   x = r * sin(phi) * cos(theta)
 *   y = r * cos(phi)
 *   z = r * sin(phi) * sin(theta)
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number = 1
): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD
  const theta = (90 - lon) * DEG2RAD

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * Convert 3D position back to lat/lon.
 * Inverse of latLonToVector3.
 */
export function vector3ToLatLon(
  position: THREE.Vector3
): { lat: number; lon: number } {
  const radius = position.length()
  const lat = 90 - Math.acos(position.y / radius) / DEG2RAD
  const theta = Math.atan2(position.z, position.x)
  let lon = 90 - theta / DEG2RAD
  // Normalize to [-180, 180]
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360
  return { lat, lon }
}
