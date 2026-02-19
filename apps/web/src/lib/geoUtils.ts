import * as THREE from 'three'

const DEG2RAD = Math.PI / 180

/**
 * Convert latitude/longitude to 3D position on a sphere.
 * Three.js uses Y-up coordinate system.
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number = 1
): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD
  const theta = (lon + 180) * DEG2RAD

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * Convert 3D position back to lat/lon.
 */
export function vector3ToLatLon(
  position: THREE.Vector3
): { lat: number; lon: number } {
  const radius = position.length()
  const lat = 90 - Math.acos(position.y / radius) / DEG2RAD
  const lon = -(Math.atan2(position.z, -position.x) / DEG2RAD - 180)
  return {
    lat,
    lon: lon > 180 ? lon - 360 : lon,
  }
}
