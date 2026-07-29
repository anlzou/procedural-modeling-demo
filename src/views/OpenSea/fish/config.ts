import * as THREE from 'three/webgpu'
import type { FishConfig, SimulationSettings, VirtualAquarium } from './types.js'

/** Virtual aquarium boundary — centered below the ocean surface */
export let virtualAquarium: VirtualAquarium = {
  center: new THREE.Vector3(0, -25, 0),
  halfSize: new THREE.Vector3(50, 25, 50),
  surfaceY: 0,
  floorY: -50,
}

/** Update the aquarium XZ size (20–100). Depth stays at 50. */
export function setAquariumSize(size: number) {
  const clamped = Math.max(10, Math.min(50, size / 2))
  virtualAquarium.halfSize.set(clamped, 25, clamped)
}

export const fishConfig = {
  radius: 0.6,
  length: 1.6,
  renderScale: 1,
  radialSegments: 36,
  heightSegments: 3,
  highlightedIndex: 0,
  bodyColor: new THREE.Color(0xf2f6ff),
  highlightedColor: new THREE.Color(0xf2f6ff),
  appearanceVariants: [
    new THREE.Color(0xf2f6ff),
    new THREE.Color(0xff8a2a),
    new THREE.Color(0xf7efe2),
    new THREE.Color(0x8fa4ad),
  ],
  renderBoundsRadius: 80,
  swimFrequencyMin: 0.9,
  swimFrequencyMax: 2.1,
  swimTailBeatMinIntervalSeconds: 0.65,
  maxBankAngle: THREE.MathUtils.degToRad(12),
  bankTurnScale: 0.18,
  bankResponse: 8,
  curveDeformationStrength: 0.72,
  curveDeformationMax: 2.35,
  curveDeformationResponse: 12,
  swimCurveStrength: 0.92,
  swimAccelerationThreshold: 0.35,
  swimAccelerationFull: 2.4,
  swimAccelerationPulseSeconds: 0.32,
  swimTurnCurveStart: 0.08,
} satisfies FishConfig

export function createDefaultSettings(): SimulationSettings {
  return {
    minSpeed: 3,
    maxSpeed: 7.5,
    maxTurnRate: 4,
    perceptionRadius: 2.7,
    avoidanceRadius: 1,
    maxSteerForce: 3,
    alignWeight: 1,
    cohesionWeight: 1,
    separateWeight: 1.35,
    boundsRadius: 0.27,
    avoidCollisionWeight: 10,
    collisionAvoidDistance: 5,
    boundaryWeight: 9,
    boundaryMargin: 2,
    topBoundaryMargin: 0.42,
    bottomBoundaryMargin: 2,
    horizontalBoundaryMargin: 2,
  }
}

/** No physical obstacles in the open sea virtual aquarium */
export const obstacles = []

export const fishModelSources = [
  {
    key: 'cartoon',
    useAppearanceVariants: false,
  },
  {
    key: 'koi',
    useAppearanceVariants: false,
  },
]
