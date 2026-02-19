import * as THREE from 'three'
import { ATTACK_COLORS, type AttackType } from '@cyberpulse/shared'

const colorCache = new Map<string, THREE.Color>()

export function getAttackColor(type: AttackType): THREE.Color {
  if (!colorCache.has(type)) {
    colorCache.set(type, new THREE.Color(ATTACK_COLORS[type]))
  }
  return colorCache.get(type)!
}
