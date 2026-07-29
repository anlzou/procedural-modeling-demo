import * as THREE from 'three/webgpu'
import {
  createFishMotionScratch,
  createFishMotionState,
  updateFishMotionState,
} from './motion-state.js'
import { SpatialGrid } from './spatial-grid.js'
import { createRayDirections, mulberry32, randomPointInAquarium, randomPointInSphere } from './random.js'
import type {
  FishMotionScratch,
  FishSimulationTrace,
  FishState,
  Obstacle,
  RandomSource,
  SimulationSettings,
  VirtualAquarium,
} from './types.js'

interface FishSchoolSimulationOptions {
  aquarium: VirtualAquarium
  obstacles: Obstacle[]
  settings: SimulationSettings
}

interface UpdateOptions {
  traceIndex?: number
}

export class FishSchoolSimulation {
  aquarium: VirtualAquarium
  obstacles: Obstacle[]
  settings: SimulationSettings
  fish: FishState[]
  random: RandomSource
  rayDirections: THREE.Vector3[]
  fishMotionScratch: FishMotionScratch
  grid: SpatialGrid<FishState>
  nextVelocities: THREE.Vector3[]
  nextPositions: THREE.Vector3[]
  tmpOffset: THREE.Vector3
  tmpNeighborDir: THREE.Vector3
  tmpAvoid: THREE.Vector3
  tmpForward: THREE.Vector3
  tmpDesired: THREE.Vector3
  accel: THREE.Vector3
  headingSum: THREE.Vector3
  centerSum: THREE.Vector3
  avoidanceSum: THREE.Vector3
  steerOut: THREE.Vector3
  boundaryOut: THREE.Vector3
  clearDirOut: THREE.Vector3
  tmpRayDir: THREE.Vector3
  tmpRayEnd: THREE.Vector3
  tmpRayLocalOrigin: THREE.Vector3
  tmpRayLocalDir: THREE.Vector3
  tmpTurnCurrent: THREE.Vector3
  tmpTurnDesired: THREE.Vector3
  tmpQuat: THREE.Quaternion
  forwardAxis: THREE.Vector3

  constructor({ aquarium, obstacles, settings }: FishSchoolSimulationOptions) {
    this.aquarium = aquarium
    this.obstacles = obstacles
    this.settings = settings
    this.fish = []
    this.random = mulberry32(42)
    this.rayDirections = createRayDirections(120)
    this.fishMotionScratch = createFishMotionScratch()
    this.grid = new SpatialGrid(settings.perceptionRadius)
    this.nextVelocities = []
    this.nextPositions = []
    this.tmpOffset = new THREE.Vector3()
    this.tmpNeighborDir = new THREE.Vector3()
    this.tmpAvoid = new THREE.Vector3()
    this.tmpForward = new THREE.Vector3()
    this.tmpDesired = new THREE.Vector3()
    this.accel = new THREE.Vector3()
    this.headingSum = new THREE.Vector3()
    this.centerSum = new THREE.Vector3()
    this.avoidanceSum = new THREE.Vector3()
    this.steerOut = new THREE.Vector3()
    this.boundaryOut = new THREE.Vector3()
    this.clearDirOut = new THREE.Vector3()
    this.tmpRayDir = new THREE.Vector3()
    this.tmpRayEnd = new THREE.Vector3()
    this.tmpRayLocalOrigin = new THREE.Vector3()
    this.tmpRayLocalDir = new THREE.Vector3()
    this.tmpTurnCurrent = new THREE.Vector3()
    this.tmpTurnDesired = new THREE.Vector3()
    this.tmpQuat = new THREE.Quaternion()
    this.forwardAxis = new THREE.Vector3(0, 0, 1)
  }

  reset(count: number, seed = 42): void {
    const targetCount = normalizeFishCount(count, 0)
    this.fish.length = 0
    this.random = mulberry32(seed)
    for (let i = 0; i < targetCount; i += 1) {
      this.fish.push(this.createFish(i))
    }
  }

  setCount(count: number): void {
    const targetCount = normalizeFishCount(count, this.fish.length)
    if (targetCount < this.fish.length) {
      this.fish.length = targetCount
      return
    }
    while (this.fish.length < targetCount) {
      this.fish.push(this.createFish(this.fish.length))
    }
  }

  createFish(index = this.fish.length): FishState {
    const position = randomPointInAquarium(this.random, this.aquarium.halfSize, this.aquarium.center, 0.62)
    const direction = randomPointInSphere(this.random, 1).normalize()
    const speed = THREE.MathUtils.lerp(this.settings.minSpeed, this.settings.maxSpeed, this.random())
    return {
      position,
      velocity: direction.multiplyScalar(speed),
      ...this.createMotionState(index),
    }
  }

  createMotionState(index = this.fish.length) {
    return createFishMotionState(index)
  }

  ensureBuffers(count: number): void {
    while (this.nextVelocities.length < count) {
      this.nextVelocities.push(new THREE.Vector3())
      this.nextPositions.push(new THREE.Vector3())
    }
  }

  update(dt: number, options: UpdateOptions = {}): FishSimulationTrace | null {
    const count = this.fish.length
    this.ensureBuffers(count)
    this.grid.setCellSize(this.settings.perceptionRadius)
    this.grid.build(this.fish)

    const nextVelocities = this.nextVelocities
    const nextPositions = this.nextPositions
    let trace: FishSimulationTrace | null = null

    const perceptionSq = this.settings.perceptionRadius * this.settings.perceptionRadius
    const avoidanceSq = this.settings.avoidanceRadius * this.settings.avoidanceRadius

    for (let i = 0; i < count; i += 1) {
      const fish = this.fish[i]
      if (!fish) continue
      const acceleration = this.accel.set(0, 0, 0)
      const components = options.traceIndex === i
        ? { align: new THREE.Vector3(), cohesion: new THREE.Vector3(), separation: new THREE.Vector3(), obstacle: new THREE.Vector3(), boundary: new THREE.Vector3() }
        : null
      const headingSum = this.headingSum.set(0, 0, 0)
      const centerSum = this.centerSum.set(0, 0, 0)
      const avoidanceSum = this.avoidanceSum.set(0, 0, 0)
      let neighborCount = 0
      let collisionAvoidanceActive = false
      let boundaryAvoidanceActive = false

      const neighbors = this.grid.queryNeighbors(fish.position)
      for (let n = 0; n < neighbors.length; n += 1) {
        const j = neighbors[n]
        if (i === j) continue
        const other = this.fish[j]
        if (!other) continue
        const offset = this.tmpOffset.subVectors(other.position, fish.position)
        const distanceSq = offset.lengthSq()

        if (distanceSq < perceptionSq) {
          neighborCount += 1
          headingSum.add(this.tmpNeighborDir.copy(other.velocity).normalize())
          centerSum.add(other.position)
          if (distanceSq < avoidanceSq) {
            const distance = Math.sqrt(Math.max(distanceSq, 0.0001))
            avoidanceSum.add(this.tmpAvoid.copy(offset).multiplyScalar(-1 / distance))
          }
        }
      }

      if (neighborCount > 0) {
        centerSum.multiplyScalar(1 / neighborCount)
        const align = this.steerTowards(headingSum, fish.velocity, this.steerOut)
          .multiplyScalar(this.settings.alignWeight)
        if (components) components.align.copy(align)
        acceleration.add(align)

        const cohesion = this.steerTowards(
          centerSum.sub(fish.position), fish.velocity, this.steerOut,
        ).multiplyScalar(this.settings.cohesionWeight)
        if (components) components.cohesion.copy(cohesion)
        acceleration.add(cohesion)

        const separation = this.steerTowards(avoidanceSum, fish.velocity, this.steerOut)
          .multiplyScalar(this.settings.separateWeight)
        if (components) components.separation.copy(separation)
        acceleration.add(separation)
      }

      const forward = this.tmpForward.copy(fish.velocity).normalize()
      if (this.isHeadingForCollision(fish.position, forward)) {
        collisionAvoidanceActive = true
        const clearDirection = this.obstacleRays(fish.position, forward)
        const obstacle = this.steerTowards(clearDirection, fish.velocity, this.steerOut)
          .multiplyScalar(this.settings.avoidCollisionWeight)
        acceleration.add(obstacle)
        if (components) components.obstacle.copy(obstacle)
      }

      const boundary = this.aquariumBoundarySteer(fish.position)
      if (boundary.lengthSq() > 0) {
        boundaryAvoidanceActive = true
        const boundaryForce = this.steerTowards(boundary, fish.velocity, this.steerOut)
          .multiplyScalar(this.settings.boundaryWeight)
        acceleration.add(boundaryForce)
        if (components) components.boundary.copy(boundaryForce)
      }

      const desiredVelocity = this.tmpDesired.copy(fish.velocity).addScaledVector(acceleration, dt)
      const speed = THREE.MathUtils.clamp(desiredVelocity.length(), this.settings.minSpeed, this.settings.maxSpeed)
      // Guard against zero-vector normalize → NaN when forces exactly cancel velocity
      if (desiredVelocity.lengthSq() < 0.0001) {
        desiredVelocity.copy(fish.velocity).normalize()
      }
      desiredVelocity.normalize().multiplyScalar(speed)
      const nextVelocity = nextVelocities[i]
      const nextPosition = nextPositions[i]
      const velocity = this.limitTurn(fish.velocity, desiredVelocity, dt, nextVelocity)
      nextPosition.copy(fish.position).addScaledVector(velocity, dt)

      if (components) {
        trace = {
          components, neighborCount, collisionAvoidanceActive, boundaryAvoidanceActive,
          previousVelocity: fish.velocity.clone(), nextVelocity: velocity.clone(),
        }
      }
    }

    for (let i = 0; i < count; i += 1) {
      const fish = this.fish[i]
      if (!fish) continue
      updateFishMotionState(fish, nextVelocities[i], dt, this.fishMotionScratch)
      fish.velocity.copy(nextVelocities[i])
      fish.position.copy(nextPositions[i])
    }

    return trace
  }

  steerTowards(vector: THREE.Vector3, velocity: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    if (vector.lengthSq() < 0.000001) return out.set(0, 0, 0)
    return out.copy(vector).normalize().multiplyScalar(this.settings.maxSpeed).sub(velocity)
      .clampLength(0, this.settings.maxSteerForce)
  }

  limitTurn(
    currentVelocity: THREE.Vector3, desiredVelocity: THREE.Vector3, dt: number, out: THREE.Vector3,
  ): THREE.Vector3 {
    const speed = desiredVelocity.length()
    const currentDirection = this.tmpTurnCurrent.copy(currentVelocity).normalize()
    const desiredDirection = this.tmpTurnDesired.copy(desiredVelocity).normalize()
    const angle = currentDirection.angleTo(desiredDirection)
    const maxAngle = this.settings.maxTurnRate * dt

    if (angle <= maxAngle || angle < 0.000001) return out.copy(desiredVelocity)

    const t = maxAngle / angle
    const sinAngle = Math.sin(angle)
    if (Math.abs(sinAngle) > 0.000001) {
      out.copy(currentDirection).multiplyScalar(Math.sin((1 - t) * angle) / sinAngle)
        .addScaledVector(desiredDirection, Math.sin(t * angle) / sinAngle)
    } else {
      out.copy(currentDirection).lerp(desiredDirection, t)
    }
    if (out.lengthSq() < 0.0001) out.copy(desiredDirection)
    return out.normalize().multiplyScalar(speed)
  }

  isHeadingForCollision(position: THREE.Vector3, forward: THREE.Vector3): boolean {
    if (this.rayHitsObstacle(position, forward, this.settings.collisionAvoidDistance)) return true
    const end = this.tmpRayEnd.copy(position).addScaledVector(forward, this.settings.collisionAvoidDistance)
    return !this.isInsidePredictedAquarium(end, this.settings.boundsRadius)
  }

  obstacleRays(position: THREE.Vector3, forward: THREE.Vector3): THREE.Vector3 {
    this.tmpQuat.setFromUnitVectors(this.forwardAxis, forward)
    for (const localDirection of this.rayDirections) {
      const direction = this.tmpRayDir.copy(localDirection).applyQuaternion(this.tmpQuat).normalize()
      const end = this.tmpRayEnd.copy(position).addScaledVector(direction, this.settings.collisionAvoidDistance)
      if (!this.rayHitsObstacle(position, direction, this.settings.collisionAvoidDistance)) {
        if (this.isInsidePredictedAquarium(end, this.settings.boundsRadius)) {
          return this.clearDirOut.copy(direction)
        }
      }
    }
    return this.clearDirOut.copy(forward)
  }

  rayHitsObstacle(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): boolean {
    for (const obstacle of this.obstacles) {
      if (this.rayHitsSingleObstacle(origin, direction, maxDistance, obstacle)) return true
    }
    return false
  }

  rayHitsSingleObstacle(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number, obstacle: Obstacle): boolean {
    if ((obstacle.shape === 'box' || obstacle.shape === 'plate') && obstacle.size) {
      return this.rayHitsBoxObstacle(origin, direction, maxDistance, obstacle)
    }
    const radius = (obstacle as any).radius
    if (typeof radius === 'number') return this.rayHitsSphereObstacle(origin, direction, maxDistance, { ...obstacle, radius })
    return false
  }

  rayHitsBoxObstacle(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number, obstacle: any): boolean {
    const halfSize = obstacle.size.clone().multiplyScalar(0.5)
    const localOrigin = this.tmpRayLocalOrigin.copy(origin).sub(obstacle.position)
    if (obstacle.rotationY) {
      const cos = Math.cos(-obstacle.rotationY)
      const sin = Math.sin(-obstacle.rotationY)
      localOrigin.set(
        localOrigin.x * cos - localOrigin.z * sin,
        localOrigin.y,
        localOrigin.x * sin + localOrigin.z * cos,
      )
    }
    const localDir = this.tmpRayLocalDir.copy(direction)
    if (obstacle.rotationY) {
      const cos = Math.cos(-obstacle.rotationY)
      const sin = Math.sin(-obstacle.rotationY)
      localDir.set(
        localDir.x * cos - localDir.z * sin,
        localDir.y,
        localDir.x * sin + localDir.z * cos,
      )
    }

    let tMin = -Infinity
    let tMax = Infinity
    for (let axis = 0; axis < 3; axis += 1) {
      const d = localDir.getComponent(axis)
      const o = localOrigin.getComponent(axis)
      const h = halfSize.getComponent(axis)
      if (Math.abs(d) < 0.000001) {
        if (Math.abs(o) > h) return false
      } else {
        let t1 = (-h - o) / d
        let t2 = (h - o) / d
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp }
        tMin = Math.max(tMin, t1)
        tMax = Math.min(tMax, t2)
        if (tMin > tMax || tMax < 0) return false
      }
    }
    return tMin < maxDistance
  }

  rayHitsSphereObstacle(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number, obstacle: any): boolean {
    const toCenter = this.tmpOffset.copy(obstacle.position).sub(origin)
    const proj = toCenter.dot(direction)
    if (proj < 0) return false
    const closestDistSq = toCenter.lengthSq() - proj * proj
    const radiusSq = obstacle.radius * obstacle.radius
    if (closestDistSq > radiusSq) return false
    const halfChord = Math.sqrt(Math.max(0, radiusSq - closestDistSq))
    return (proj - halfChord) < maxDistance
  }

  isInsidePredictedAquarium(position: THREE.Vector3, margin: number): boolean {
    const hs = this.aquarium.halfSize
    const c = this.aquarium.center
    return (
      position.x >= c.x - hs.x + margin &&
      position.x <= c.x + hs.x - margin &&
      position.y >= c.y - hs.y + margin &&
      position.y <= c.y + hs.y - margin &&
      position.z >= c.z - hs.z + margin &&
      position.z <= c.z + hs.z - margin
    )
  }

  aquariumBoundarySteer(position: THREE.Vector3): THREE.Vector3 {
    const out = this.boundaryOut.set(0, 0, 0)
    const hs = this.aquarium.halfSize
    const c = this.aquarium.center
    const margin = this.settings.boundaryMargin
    const topMargin = this.settings.topBoundaryMargin
    const bottomMargin = this.settings.bottomBoundaryMargin
    const hMargin = this.settings.horizontalBoundaryMargin

    const dx = position.x - c.x
    const dy = position.y - c.y
    const dz = position.z - c.z

    if (dx > hs.x - hMargin) out.x += (hs.x - hMargin - dx) * 0.5
    if (dx < -hs.x + hMargin) out.x += (-hs.x + hMargin - dx) * 0.5
    if (dy > hs.y - topMargin) out.y += (hs.y - topMargin - dy) * 0.5
    if (dy < -hs.y + bottomMargin) out.y += (-hs.y + bottomMargin - dy) * 0.5
    if (dz > hs.z - hMargin) out.z += (hs.z - hMargin - dz) * 0.5
    if (dz < -hs.z + hMargin) out.z += (-hs.z + hMargin - dz) * 0.5

    return out
  }
}

function normalizeFishCount(count: number, currentLength: number): number {
  const clamped = Math.max(0, Math.floor(count))
  return clamped
}
