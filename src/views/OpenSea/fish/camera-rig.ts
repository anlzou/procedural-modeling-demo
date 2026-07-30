import * as THREE from 'three/webgpu'
import { getFishHeadPose } from './pose.js'
import type { FishState } from './types.js'

const FISH_CAMERA_POSITION_RESPONSE = 10
const FISH_CAMERA_DIRECTION_RESPONSE = 5
const FISH_CAMERA_LOOK_AHEAD = 3.6
const worldUp = new THREE.Vector3(0, 1, 0)
const fallbackUp = new THREE.Vector3(1, 0, 0)

/**
 * Fish-eye camera following a randomly selected fish.
 * Enter: picks a random fish from the pool and follows it.
 * Exit: switches back to orbit mode.
 */
export function createCameraRig(existingControls: any) {
  const orbitCamera = existingControls.object as THREE.PerspectiveCamera

  const fishCamera = new THREE.PerspectiveCamera(74, orbitCamera.aspect, 0.03, 8000)

  const pose = { position: new THREE.Vector3(), direction: new THREE.Vector3(0, 0, -1) }
  const smoothedFishPosition = new THREE.Vector3()
  const smoothedFishDirection = new THREE.Vector3(0, 0, -1)
  const target = new THREE.Vector3()
  const up = new THREE.Vector3()
  let active = false
  let trackedFish: FishState | null = null
  let fishCameraInitialized = false

  return {
    get activeCamera() {
      return active ? fishCamera : orbitCamera
    },
    get active() {
      return active
    },

    /** Pick a random fish from the available pool and start following it */
    enter(randomFish: FishState | null) {
      if (!randomFish) return
      trackedFish = randomFish
      active = true
      fishCameraInitialized = false
    },

    /** Stop fish cam and return to orbit */
    exit() {
      active = false
      trackedFish = null
      fishCameraInitialized = false
    },

    update(dt: number) {
      if (!active || !trackedFish) return

      getFishHeadPose(trackedFish, pose)

      if (!fishCameraInitialized || dt <= 0) {
        smoothedFishPosition.copy(pose.position)
        smoothedFishDirection.copy(pose.direction)
        fishCameraInitialized = true
      } else {
        const positionAlpha = 1 - Math.exp(-FISH_CAMERA_POSITION_RESPONSE * dt)
        const directionAlpha = 1 - Math.exp(-FISH_CAMERA_DIRECTION_RESPONSE * dt)
        smoothedFishPosition.lerp(pose.position, positionAlpha)
        smoothedFishDirection.lerp(pose.direction, directionAlpha).normalize()
      }

      ;(fishCamera as any).position.copy(smoothedFishPosition)
      up.copy(worldUp).addScaledVector(smoothedFishDirection, -worldUp.dot(smoothedFishDirection))
      if (up.lengthSq() < 0.0001) {
        up.copy(fallbackUp).addScaledVector(smoothedFishDirection, -fallbackUp.dot(smoothedFishDirection))
      }
      ;(fishCamera as any).up.copy(up.normalize())
      ;(fishCamera as any).lookAt(
        target.copy(smoothedFishPosition).addScaledVector(smoothedFishDirection, FISH_CAMERA_LOOK_AHEAD),
      )
    },

    resize(width: number, height: number) {
      const aspect = Math.max(1, width) / Math.max(1, height)
      ;(fishCamera as any).aspect = aspect
      ;(fishCamera as any).updateProjectionMatrix()
    },
  }
}

export function bindCameraToggle(
  cameraRig: ReturnType<typeof createCameraRig>,
  getRandomFish: () => FishState | null,
  onExit: () => void,
) {
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return
    event.preventDefault()
    if (cameraRig.active) {
      cameraRig.exit()
      onExit()
    } else {
      const fish = getRandomFish()
      cameraRig.enter(fish)
    }
  })
}
