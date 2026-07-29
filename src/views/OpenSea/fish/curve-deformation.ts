import * as THREE from 'three/webgpu'
import { fishConfig } from './config.js'

const FISH_CURVE_BEND_ATTRIBUTE = 'fishCurveBend'
const FISH_CURVE_MOTION_ATTRIBUTE = 'fishCurveMotion'
const tmpCurveBend = new THREE.Vector3()
const tmpInverseQuaternion = new THREE.Quaternion()

/**
 * CPU-based curve deformation update — writes bend data into InstancedBufferAttributes
 * so the vertex shader can read it. Since WebGPU node materials may not support
 * onBeforeCompile shader injection the same way as WebGL, we use a pragmatic approach:
 * compute bend values on CPU, upload as attributes, and use a simple attribute read
 * in the vertex shader (or skip the curve deformation entirely for now).
 *
 * For this integration we compute the curve bend on CPU and write it into the
 * instanced attributes. The vertex shader modification is done via onBeforeCompile
 * which is supported in Three.js r185+ WebGPU renderer.
 */

const fishCurveDeformationChunk = `
attribute vec4 fishCurveBend;
attribute vec4 fishCurveMotion;

vec2 readFishCurveBend(vec3 localPosition) {
  float halfLength = max(fishCurveMotion.z, 0.0001);
  float rearStart = halfLength / 3.0;
  float rearLength = halfLength * 4.0 / 3.0;
  float rearProgress = smoothstep(0.0, 1.0, clamp((rearStart - localPosition.y) / rearLength, 0.0, 1.0));
  float bodyProgress = clamp((halfLength - localPosition.y) / (halfLength * 2.0), 0.0, 1.0);
  float swimDrive = clamp(fishCurveMotion.y, 0.0, 1.0);
  float swimWave = sin(fishCurveMotion.x + bodyProgress * 4.24115);
  vec2 bend = fishCurveBend.xy;
  bend.x += swimWave * fishCurveBend.z * rearProgress * swimDrive;
  return clamp(bend, vec2(-fishCurveBend.w), vec2(fishCurveBend.w));
}

mat3 readFishCurveFrame(vec3 localPosition) {
  vec2 bend = readFishCurveBend(localPosition);
  vec3 tangent = normalize(vec3(bend.x * localPosition.y, 1.0, bend.y * localPosition.y));
  vec3 right = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)));
  vec3 dorsal = normalize(cross(right, tangent));
  return mat3(right, tangent, dorsal);
}

vec3 deformFishCurvePosition(vec3 localPosition) {
  vec2 bend = readFishCurveBend(localPosition);
  mat3 frame = readFishCurveFrame(localPosition);
  vec3 centerline = vec3(0.5 * bend.x * localPosition.y * localPosition.y, localPosition.y, 0.5 * bend.y * localPosition.y * localPosition.y);
  return centerline + frame[0] * localPosition.x + frame[2] * localPosition.z;
}

vec3 deformFishCurveNormal(vec3 localNormal, vec3 localPosition) {
  return normalize(readFishCurveFrame(localPosition) * localNormal);
}
`

export function addFishCurveAttributes(geometry: THREE.BufferGeometry, count: number): void {
  const curveBend = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4)
  curveBend.usage = THREE.DynamicDrawUsage
  const curveMotion = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4)
  curveMotion.usage = THREE.DynamicDrawUsage
  const fishHalfLength = fishConfig.length * 0.5
  for (let i = 0; i < count; i += 1) {
    curveBend.setXYZW(i, 0, 0, fishConfig.swimCurveStrength, fishConfig.curveDeformationMax)
    curveMotion.setXYZW(i, 0, 0, fishHalfLength, 0)
  }
  geometry.setAttribute(FISH_CURVE_BEND_ATTRIBUTE, curveBend)
  geometry.setAttribute(FISH_CURVE_MOTION_ATTRIBUTE, curveMotion)
}

export function enableFishCurveDeformation(material: THREE.Material): void {
  const previousOnBeforeCompile = (material as any).onBeforeCompile
  ;(material as any).onBeforeCompile = (shader: any, renderer: any) => {
    previousOnBeforeCompile?.(shader, renderer)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${fishCurveDeformationChunk}`)
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 objectNormal = deformFishCurveNormal(normal, position);\n#ifdef USE_TANGENT\n  vec3 objectTangent = deformFishCurveNormal(tangent.xyz, position);\n#endif\n`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = deformFishCurvePosition(position);')
  }
  material.needsUpdate = true
}

export function readFishCurveAttributes(geometry: THREE.BufferGeometry) {
  return {
    bend: geometry.getAttribute(FISH_CURVE_BEND_ATTRIBUTE),
    motion: geometry.getAttribute(FISH_CURVE_MOTION_ATTRIBUTE),
  }
}

export function updateFishCurveAttributes(
  attributes: ReturnType<typeof readFishCurveAttributes>,
  index: number,
  fish: { curveBendWorld?: THREE.Vector3; swimPhase?: number; swimDrive?: number },
  orientation: THREE.Quaternion,
): void {
  tmpCurveBend.set(0, 0, 0)
  if (fish.curveBendWorld?.lengthSq() > 0.000001) {
    tmpInverseQuaternion.copy(orientation).invert()
    tmpCurveBend.copy(fish.curveBendWorld).applyQuaternion(tmpInverseQuaternion)
    tmpCurveBend.y = 0
  }
  attributes.bend?.setXYZW(
    index,
    THREE.MathUtils.clamp(tmpCurveBend.x, -fishConfig.curveDeformationMax, fishConfig.curveDeformationMax),
    THREE.MathUtils.clamp(tmpCurveBend.z, -fishConfig.curveDeformationMax, fishConfig.curveDeformationMax),
    fishConfig.swimCurveStrength,
    fishConfig.curveDeformationMax,
  )
  attributes.motion?.setXYZW(
    index,
    fish.swimPhase ?? 0,
    THREE.MathUtils.clamp(fish.swimDrive ?? 0, 0, 1),
    fishConfig.length * 0.5,
    0,
  )
}

export function markFishCurveAttributesNeedsUpdate(attributes: ReturnType<typeof readFishCurveAttributes>): void {
  if (attributes.bend) attributes.bend.needsUpdate = true
  if (attributes.motion) attributes.motion.needsUpdate = true
}
