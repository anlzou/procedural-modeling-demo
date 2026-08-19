import * as THREE from 'three/webgpu'
import { Fn, uniform, attribute, vec4, smoothstep, clamp } from 'three/tsl'

/**
 * 风暴闪电系统：
 *  - 真实闪电时序：阶梯先导从顶部→底部逐级延伸（uProgress 揭示）→ 回击全亮 → 多次再击衰减
 *  - 粗锯齿闪电束（三角带 Mesh，宽度可调、叠加混合）+ 递归分支（1~2 级）
 *  - 天空闪烁：主闪 + 多次再击（STROKE_COUNT 次、强度递减）驱动 uLightning
 *  - 屏幕闪光（白屏）与闪电本体解耦：白屏更快消失，闪电保留更久
 */

export function createLightningSystem(
  scene: THREE.Scene,
  flashUniform?: { value: number },
) {
  /* ============================================================
     ✋ 微调区 —— 闪电参数（可按需调整）
     ------------------------------------------------------------
     【几何形状】
     BOLT_TOP_Y_MIN / RANGE   起始高度（越高越接近云层顶部）
     BOLT_DIST_MIN / RANGE    闪电中心距相机的水平距离（越大越远越小）
     BOLT_SEGMENTS_MIN/RANGE  锯齿分段数（越多越曲折）
     BOLT_JITTER              每段横向抖动幅度（越大锯齿越夸张）
     BOLT_WIDTH               闪电顶部（云层端）带宽（越大越粗壮；顶部粗 → 底部渐变细）
     BOLT_TAPER               底部（尖端）宽度占顶部的比例（越小越尖锐，0=收成一点）
     BOLT_BRANCH_START        从第几段开始允许出现分支
     BOLT_BRANCH_CHANCE       每段生成分支的概率（0~1）
     BOLT_BRANCH_JITTER       分支抖动幅度
     BOLT_BRANCH_LEN_MIN/RANGE 分支长度（占“一段步长”的比例）
     【触发节奏】
     AUTO_FIRST_MIN / RANGE   进入风暴后首次自动闪电延迟（秒）
     AUTO_INTERVAL_MIN / RANGE 自动闪电间隔（秒）
     【动画时序（顶部→底部 + 回击 + 衰减）】
     LEADER_TIME              先导逐级延伸总时长（秒；顶部→底部）
     RETURN_ATTACK            回击峰值上升时间（秒，几乎瞬间）
     BOLT_DECAY               闪电本体衰减速率（↓ 越慢闪电保留越久）
     【天空闪烁（多次再击）】
     FLASH_STRENGTH           主闪/回击时屏幕闪光初始强度（↓ 减小避免长时间白屏）
     FLASH_DECAY              屏幕闪光衰减速率（↑ 越快白屏越短）
     STROKE_COUNT             回击后再击次数（越多天空闪烁越明显）
     STROKE_INTERVAL_MIN/MAX  再击间隔（秒）
     STROKE_DECAY             再击强度衰减系数（每次 × 该值，递减）
     【分支】
     BRANCH_LEVELS            分支级数（1=主干直分支，2=含二级分叉）
     BRANCH_SUB_CHANCE        子分支再分叉概率（0~1）
     BRANCH_SPAN              分支在 uProgress 中的揭示跨度（越小分支越晚点亮）
     ============================================================ */
  const BOLT_TOP_Y_MIN = 55
  const BOLT_TOP_Y_RANGE = 30
  const BOLT_DIST_MIN = 80
  const BOLT_DIST_RANGE = 120
  const BOLT_SEGMENTS_MIN = 30
  const BOLT_SEGMENTS_RANGE = 5
  const BOLT_JITTER = 9
  const BOLT_WIDTH = 2.2
  const BOLT_TAPER = 0.05
  const BOLT_BRANCH_START = 2
  const BOLT_BRANCH_CHANCE = 0.6
  const BOLT_BRANCH_JITTER = 12
  const BOLT_BRANCH_LEN_MIN = 0.4
  const BOLT_BRANCH_LEN_RANGE = 0.6
  const BRANCH_LEVELS = 2
  const BRANCH_SUB_CHANCE = 0.4
  const BRANCH_SPAN = 0.12
  const AUTO_FIRST_MIN = 1
  const AUTO_FIRST_RANGE = 3
  const AUTO_INTERVAL_MIN = 4
  const AUTO_INTERVAL_RANGE = 8
  const LEADER_TIME = 0.82
  const RETURN_ATTACK = 0.008
  const FLASH_STRENGTH = 0.5
  const FLASH_DECAY = 6
  const BOLT_DECAY = 0.1 // 闪电消失更慢，保留更久
  const STROKE_COUNT = 3
  const STROKE_INTERVAL_MIN = 0.06
  const STROKE_INTERVAL_MAX = 0.12
  const STROKE_DECAY = 0.72

  // 逐级揭示 uniform：uProgress=0 顶部，=1 全部点亮；uOpacity=本体不透明度
  const uProgress = uniform(1.0)
  const uOpacity = uniform(0.0)

  // 闪电束材质（蓝白、叠加、不写深度、双面）；TSL 节点材质 → 顶部→底部逐级揭示
  const boltMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  boltMaterial.fragmentNode = Fn(() => {
    // 顶点沿路径进度（0=顶部，1=底部；分支带各自起始进度）
    const prog = attribute('progress')
    // 逐级揭示：uProgress 之前的段点亮，边缘软过渡（先导下行的生长效果）
    const reveal = smoothstep(uProgress.sub(0.08), uProgress, prog)
    const col = vec4(0.85, 0.9, 1.0, 1.0).mul(uOpacity).mul(reveal)
    return vec4(col.xyz, clamp(col.w, 0.0, 1.0))
  })()

  const boltMesh = new THREE.Mesh(new THREE.BufferGeometry(), boltMaterial)
  boltMesh.visible = false
  boltMesh.frustumCulled = false
  scene.add(boltMesh)

  let nextStrike = AUTO_FIRST_MIN + Math.random() * AUTO_FIRST_RANGE // 进入风暴后首次延迟
  let screenFlash = 0 // 屏幕闪光强度（点亮天空/海洋），0~1
  let boltOpacity = 0 // 闪电本体不透明度（与屏幕闪光解耦，保留更久）
  let active = false
  // 阶段机：idle → leader（先导逐级下行）→ return（回击全亮）→ decay（衰减 + 再击闪烁）
  let phase: 'idle' | 'leader' | 'return' | 'decay' = 'idle'
  let phaseT = 0 // 当前阶段已用时间
  let progress = 0 // uProgress 0→1
  let strokes: { t: number; strength: number; fired: boolean }[] = [] // 再击时间表

  /** 计算折线总长（用于按路径归一化进度） */
  function pathLen(path: THREE.Vector3[]) {
    let len = 0
    for (let i = 1; i < path.length; i++) len += path[i].distanceTo(path[i - 1])
    return len
  }

  /**
   * 递归生成分支：在父路径若干段上随机长出子分支（可多级），
   * 分支进度从父点进度开始（+BRANCH_SPAN），与主干共用 uProgress 揭示曲线。
   */
  function spawnBranches(
    parent: THREE.Vector3[],
    parentProg: number[],
    level: number,
    out: { pts: THREE.Vector3[]; prog: number[] }[],
  ) {
    if (level > BRANCH_LEVELS) return
    // 主干（level=1）从 BOLT_BRANCH_START 段开始；子分支从自身第 1 段开始
    const startIdx = level === 1 ? BOLT_BRANCH_START : 0
    for (let i = startIdx; i < parent.length - 1; i++) {
      if (Math.random() > BOLT_BRANCH_CHANCE) continue
      const a = parent[i]
      const len = a.distanceTo(parent[i + 1]) * (BOLT_BRANCH_LEN_MIN + Math.random() * BOLT_BRANCH_LEN_RANGE)
      const end = new THREE.Vector3(
        a.x + (Math.random() - 0.5) * BOLT_BRANCH_JITTER,
        a.y - len,
        a.z + (Math.random() - 0.5) * BOLT_BRANCH_JITTER,
      )
      const pts = [a.clone(), end]
      const p0 = parentProg[i]
      const prog = [p0, Math.min(1, p0 + BRANCH_SPAN)]
      out.push({ pts, prog })
      // 二级分叉
      if (level < BRANCH_LEVELS && Math.random() < BRANCH_SUB_CHANCE) {
        spawnBranches(pts, prog, level + 1, out)
      }
    }
  }

  /** 生成一道粗锯齿闪电几何体：主干 + 递归分支，均带 per-vertex progress（顶部→底部逐级揭示） */
  function buildBoltGeometry() {
    // 1) 主干路径
    const topY = BOLT_TOP_Y_MIN + Math.random() * BOLT_TOP_Y_RANGE
    const angle = Math.random() * Math.PI * 2
    const dist = BOLT_DIST_MIN + Math.random() * BOLT_DIST_RANGE
    const segments = BOLT_SEGMENTS_MIN + Math.floor(Math.random() * BOLT_SEGMENTS_RANGE)
    const step = topY / segments
    const main: THREE.Vector3[] = []
    {
      let x = Math.cos(angle) * dist
      let y = topY
      let z = Math.sin(angle) * dist
      main.push(new THREE.Vector3(x, y, z))
      for (let i = 0; i < segments; i++) {
        x += (Math.random() - 0.5) * BOLT_JITTER
        y -= step
        z += (Math.random() - 0.5) * BOLT_JITTER
        main.push(new THREE.Vector3(x, y, z))
      }
    }
    // 主干各点进度（沿路径 0→1）
    const totalLen = pathLen(main)
    const mainProg: number[] = []
    let cum = 0
    for (let i = 0; i < main.length; i++) {
      if (i > 0) cum += main[i].distanceTo(main[i - 1])
      mainProg.push(totalLen > 0 ? cum / totalLen : i / Math.max(1, main.length - 1))
    }

    // 2) 主干 + 递归分支
    const strips: { pts: THREE.Vector3[]; prog: number[] }[] = [{ pts: main, prog: mainProg }]
    spawnBranches(main, mainProg, 1, strips)

    // 3) 展开为宽 BOLT_WIDTH 的三角带（position + progress 双属性）
    const positions: number[] = []
    const progress: number[] = []
    const up = new THREE.Vector3(0, 1, 0)
    const tmpDir = new THREE.Vector3()
    const tmpPerp = new THREE.Vector3()
    for (const strip of strips) {
      const path = strip.pts
      const progs = strip.prog
      if (path.length < 2) continue
      const n = path.length
      // 逐点计算横向偏移方向 + 变宽（顶部粗 → 底部/分支尖端细，像树根）
      const offs: THREE.Vector3[] = []
      for (let i = 0; i < n; i++) {
        tmpDir.copy(path[Math.min(n - 1, i + 1)]).sub(path[Math.max(0, i - 1)])
        if (tmpDir.lengthSq() < 1e-6) tmpDir.set(0, -1, 0)
        tmpDir.normalize()
        tmpPerp.crossVectors(tmpDir, up)
        if (tmpPerp.lengthSq() < 1e-6) tmpPerp.set(1, 0, 0) // 竖直段兜底（水平加宽）
        tmpPerp.normalize()
        // 沿路径由粗到细：起点宽 BOLT_WIDTH，末端收窄到 BOLT_WIDTH×BOLT_TAPER（树根：顶粗底尖）
        const t = n > 1 ? i / (n - 1) : 0
        const halfW = (BOLT_WIDTH / 2) * (BOLT_TAPER + (1 - BOLT_TAPER) * (1 - t))
        offs.push(tmpPerp.clone().multiplyScalar(halfW))
      }
      // 相邻点组成四边形（6 顶点，非索引三角）
      for (let i = 0; i < n - 1; i++) {
        const a = path[i], b = path[i + 1]
        const oa = offs[i], ob = offs[i + 1]
        const pa = progs[i], pb = progs[i + 1]
        const alx = a.x - oa.x, aly = a.y - oa.y, alz = a.z - oa.z
        const arx = a.x + oa.x, ary = a.y + oa.y, arz = a.z + oa.z
        const blx = b.x - ob.x, bly = b.y - ob.y, blz = b.z - ob.z
        const brx = b.x + ob.x, bry = b.y + ob.y, brz = b.z + ob.z
        // AL, AR, BL
        positions.push(alx, aly, alz); progress.push(pa)
        positions.push(arx, ary, arz); progress.push(pa)
        positions.push(blx, bly, blz); progress.push(pb)
        // AR, BR, BL
        positions.push(arx, ary, arz); progress.push(pa)
        positions.push(brx, bry, brz); progress.push(pb)
        positions.push(blx, bly, blz); progress.push(pb)
      }
    }

    boltMesh.geometry.dispose()
    boltMesh.geometry = new THREE.BufferGeometry()
    boltMesh.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    boltMesh.geometry.setAttribute('progress', new THREE.BufferAttribute(new Float32Array(progress), 1))
  }

  /** 触发一次闪电（先导阶段：顶部→底部逐级延伸） */
  function strike() {
    buildBoltGeometry()
    boltMesh.visible = true
    phase = 'leader'
    phaseT = 0
    progress = 0
    strokes = []
    screenFlash = 0
    boltOpacity = 1
    uProgress.value = 0
    uOpacity.value = 1
    active = true
    if (flashUniform) flashUniform.value = 0
  }

  /** 回击：全亮 + 主闪 + 排好多次再击时间表（→ 天空闪烁） */
  function strikeReturn() {
    phase = 'return'
    phaseT = 0
    boltOpacity = 1
    screenFlash = FLASH_STRENGTH
    // 主闪之后排 STROKE_COUNT 次再击，强度逐次递减
    strokes = []
    let t = 0
    let strength = FLASH_STRENGTH * STROKE_DECAY
    for (let i = 0; i < STROKE_COUNT; i++) {
      t += STROKE_INTERVAL_MIN + Math.random() * (STROKE_INTERVAL_MAX - STROKE_INTERVAL_MIN)
      strokes.push({ t, strength, fired: false })
      strength *= STROKE_DECAY
    }
  }

  /** 手动触发一道闪电（快捷键 L，立即生效；可在自动闪光衰减中再次叠加） */
  function trigger() {
    strike()
    // 手动触发后重置自动计时，避免紧跟着又自动闪
    nextStrike = AUTO_INTERVAL_MIN + Math.random() * AUTO_INTERVAL_RANGE
  }

  function update(dt: number) {
    if (!active) {
      nextStrike -= dt
      if (nextStrike <= 0) {
        nextStrike = AUTO_INTERVAL_MIN + Math.random() * AUTO_INTERVAL_RANGE // 自动间隔
        strike()
      }
      return
    }

    phaseT += dt

    if (phase === 'leader') {
      // 阶梯先导：顶部 → 底部逐级延伸（uProgress 0→1）
      progress = Math.min(1, progress + dt / LEADER_TIME)
      uProgress.value = progress
      uOpacity.value = 1
      if (progress >= 1) strikeReturn()
    } else if (phase === 'return') {
      // 回击：瞬间全亮（RETURN_ATTACK 极短）后进入衰减
      uProgress.value = 1
      uOpacity.value = 1
      if (phaseT >= RETURN_ATTACK) {
        phase = 'decay'
        phaseT = 0
      }
    } else if (phase === 'decay') {
      // 本体慢衰减（保留更久）
      boltOpacity -= dt * BOLT_DECAY
      // 屏幕闪光快衰减（白屏短）
      screenFlash -= dt * FLASH_DECAY
      // 依次触发再击 → 天空闪烁
      for (const s of strokes) {
        if (!s.fired && phaseT >= s.t) {
          s.fired = true
          screenFlash = s.strength
        }
      }
      // 本体亮度取 max(本体, 闪光)：闪电保留更久且每次再击更亮
      uOpacity.value = Math.max(boltOpacity, screenFlash)
      if (flashUniform) flashUniform.value = Math.max(screenFlash, 0)
      // 结束
      if (boltOpacity <= 0 && screenFlash <= 0 && strokes.every((s) => s.fired)) {
        active = false
        phase = 'idle'
        phaseT = 0
        progress = 0
        boltMesh.visible = false
        uOpacity.value = 0
        if (flashUniform) flashUniform.value = 0
      }
      return
    }

    // leader / return 阶段：本体全亮（逐级揭示由着色器控制）
    uOpacity.value = 1
    if (flashUniform) flashUniform.value = Math.max(screenFlash, 0)
  }

  /** 离开风暴时重置，避免残留 */
  function reset() {
    active = false
    phase = 'idle'
    phaseT = 0
    progress = 0
    strokes = []
    screenFlash = 0
    boltOpacity = 0
    uProgress.value = 0
    uOpacity.value = 0
    boltMesh.visible = false
    if (flashUniform) flashUniform.value = 0
    nextStrike = 3 + Math.random() * 5
  }

  function dispose() {
    scene.remove(boltMesh)
    boltMesh.geometry.dispose()
    boltMaterial.dispose()
  }

  return { update, reset, dispose, trigger }
}
