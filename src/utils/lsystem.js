import * as THREE from 'three'

export class LSystem {
  constructor(axiom, rules, angle, length, iterations = 4) {
    this.axiom = axiom
    this.rules = rules
    this.angle = (angle * Math.PI) / 180
    this.length = length
    this.iterations = iterations
  }

  generate() {
    let result = this.axiom
    for (let i = 0; i < this.iterations; i++) {
      let next = ''
      for (const char of result) {
        next += this.rules[char] || char
      }
      result = next
    }
    return result
  }

  toGeometry() {
    const instructions = this.generate()
    const points = []
    const stack = []
    let pos = new THREE.Vector3(0, 0, 0)
    let dir = new THREE.Vector3(0, 1, 0)

    for (const char of instructions) {
      switch (char) {
        case 'F':
        case 'G': {
          const next = pos.clone().add(dir.clone().multiplyScalar(this.length))
          points.push(pos.clone(), next.clone())
          pos = next
          break
        }
        case '+':
          dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -this.angle)
          break
        case '-':
          dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.angle)
          break
        case '&':
          dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.angle)
          break
        case '^':
          dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.angle)
          break
        case '<':
          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.angle)
          break
        case '>':
          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle)
          break
        case '[':
          stack.push({ pos: pos.clone(), dir: dir.clone() })
          break
        case ']': {
          const state = stack.pop()
          if (state) {
            pos = state.pos
            dir = state.dir
          }
          break
        }
      }
    }

    if (points.length < 2) {
      return new THREE.BufferGeometry()
    }

    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, Math.max(points.length * 2, 8), 0.04, 6, false)
  }

  toLineGeometry() {
    const instructions = this.generate()
    const vertices = []
    const stack = []
    let pos = new THREE.Vector3(0, 0, 0)
    let dir = new THREE.Vector3(0, 1, 0)

    vertices.push(pos.x, pos.y, pos.z)

    for (const char of instructions) {
      switch (char) {
        case 'F':
        case 'G': {
          const next = pos.clone().add(dir.clone().multiplyScalar(this.length))
          vertices.push(next.x, next.y, next.z)
          pos = next
          break
        }
        case '+':
          dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -this.angle)
          break
        case '-':
          dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.angle)
          break
        case '&':
          dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.angle)
          break
        case '^':
          dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.angle)
          break
        case '[':
          stack.push({ pos: pos.clone(), dir: dir.clone() })
          break
        case ']': {
          const state = stack.pop()
          if (state) {
            pos = state.pos
            dir = state.dir
            vertices.push(pos.x, pos.y, pos.z)
          }
          break
        }
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }
}

// Preset definitions
export const L_SYSTEM_PRESETS = {
  plant: {
    name: '🌿 植物 (Plant)',
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angle: 25,
    length: 0.3,
    iterations: 5,
    color: 0x44aa44,
  },
  dragon: {
    name: '🐉 龙曲线 (Dragon Curve)',
    axiom: 'FX',
    rules: { X: 'X+YF+', Y: '-FX-Y' },
    angle: 90,
    length: 0.5,
    iterations: 8,
    color: 0xff6b6b,
  },
  sierpinski: {
    name: '🔺 谢尔宾斯基 (Sierpinski)',
    axiom: 'F-G-G',
    rules: { F: 'F-G+F+G-F', G: 'GG' },
    angle: 120,
    length: 0.4,
    iterations: 4,
    color: 0x4fc3f7,
  },
  fractalTree: {
    name: '🌳 分形树 (Fractal Tree)',
    axiom: 'F',
    rules: { F: 'F[+F]F[-F]F' },
    angle: 25.7,
    length: 0.25,
    iterations: 5,
    color: 0x8B5E3C,
  },
  koch: {
    name: '❄️ 科赫雪花 (Koch Snowflake)',
    axiom: 'F++F++F',
    rules: { F: 'F-F++F-F' },
    angle: 60,
    length: 0.3,
    iterations: 4,
    color: 0xe0e0ff,
  },
  barnsley: {
    name: '🌿 蕨类植物 (Barnsley Fern)',
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angle: 20,
    length: 0.2,
    iterations: 6,
    color: 0x66bb6a,
  },
}
