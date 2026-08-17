import * as THREE from 'three/webgpu'
import {
  Fn, uniform, float, uv, vec2, vec4,
  sin, cos, exp, abs, max, pow, mix, fract, floor,
  smoothstep, clamp, length, dot, Loop
} from 'three/tsl'

/** 流星系统配置（可在控制面板实时调整） */
export interface MeteorConfig {
  /** 轨迹模式：random = 左右互飞横穿 | radiant = 辐射点流星雨 */
  mode: 'random' | 'radiant'
  /** 辐射模式下每批（一场流星雨）的流星数量（1~6） */
  radiantBurst: number
  /** 辐射模式下从辐射点向外发散的横向范围（0.3 收窄 ~ 1.5 宽阔） */
  radiantSpread: number
  /** 火焰动画：true = 火焰随时间流动 | false = 静态火焰（默认关闭，更稳定不闪） */
  flameAnim: boolean
}

const METEOR_CONFIG_DEFAULTS: MeteorConfig = {
  mode: 'random',
  radiantBurst: 3,
  radiantSpread: 0.8,
  flameAnim: false,
}

/** 流星颜色：红 / 白 两种（对应 effect_01.wgsl 的红白双色火焰），每颗流星随机选取 */
const METEOR_COLORS = [
  new THREE.Color(1.0, 0.42, 0.22), // 红：炽热橙红
  new THREE.Color(0.98, 0.97, 1.0), // 白：白蓝炽亮
]

/**
 * 流星（shooting star）系统 — 仅用于 Clear 晴朗夜空
 *
 * 渲染方式：采用 effect_01.wgsl 的思路 —— 每颗流星是一个朝向相机的公告牌四边形（billboard quad），
 * 通过 TSL 节点着色器在片元阶段程序化生成拖尾火焰（XorDev 干涉纹理 + 噪声扰动 + tanh 色调映射），
 * 取代原先的 Line 拖尾 + Sprite 头部分离物体，整体更贴合“流星”的视觉形态。
 *
 * 轨迹模式：
 *  - random：左右两侧互相飞 —— 从左侧/右侧屏幕外进入，水平飞向对侧（左→右 / 右→左），
 *    距离镜头很远（1500~3200），出画后淡出
 *  - radiant：辐射点模式 —— 每批流星从屏幕上方的同一个辐射点附近出现，
 *    向下方/两侧扇形发散射向远方，形成流星雨视觉。
 * 火焰动画可在控制面板开启/关闭（默认关闭 = 静态火焰，更稳定不闪）。
 */
export function createMeteorSystem(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  config: Partial<MeteorConfig> = {},
) {
  // ---- 常量 ----
  const TRAIL_LEN = 840 // 着色器四边形长度（沿飞行方向，覆盖拖尾，很长）
  const TRAIL_WIDTH = 100 // 着色器四边形宽度（垂直飞行方向，世界单位）
  const SKY_DIST_MIN = 400 // 流星远距离基准（距离镜头很远才好看）
  const SKY_DIST_RANGE = 1700 // 远距离随机范围（1500~3200）
  const BEHIND_LEN = 900 // 从屏幕外/相机后方延伸出的起点长度
  const SPEED_BASE = 380 // 飞行速度基准（放慢，便于看清拖尾）
  const SPEED_RANGE = 120 // 飞行速度随机范围（380~500）
  const SKY_NDC_MIN = 0.12 // 落点 NDC y 下限（海平面之上，避免与海面相交）
  const CROSS_EXIT_X = 1.05 // 横穿屏幕模式：屏幕外横向出画点（NDC x 绝对值）
  const SKY_WORLD_MIN_Y = 36 // 头部世界高度下限（四边形半高 30 + 余量），保证整块贴图都在海平面之上
  const SEA_FADE_H = 14 // 距海面（y=0）该高度内开始淡出（安全兜底，正常轨迹不会触发）
  const FADE_DIST = 3600 // 距相机超过该距离后开始淡出（兜底，远方变暗）
  const FADE_RANGE = 1200 // 淡出过渡距离
  const POOL_SIZE = 6 // 同时最多存在的流星数

  /* ============================================================
     ✋ 微调区（A）—— 流星火焰动画（闪烁的主要来源）
     如果流星飞行时仍觉得“闪 / 抖”，优先减小下面这些值：
     ------------------------------------------------------------
     FLAME_NOISE_SPEED  噪声漂移速度（噪声场每秒移动的格子数）
                        ↑ 越大火焰结构越活跃、越“闪”；↓ 越小越安静
                        参考：0.8 平稳不闪 / 1.5 有微动 / 3.0 明显闪烁
     FLAME_WOBBLE       火焰亮度脉冲幅度 exp(sin(t)*WOBBLE)
                        ↓ 越小整体亮度越稳定（防频闪）
                        参考：0.3~0.4 很稳 / 0.6 轻微 / 0.8+ 明显呼吸
     FLAME_DRIFT        火焰纹路相位漂移速度
                        ↓ 越小图案越静止：0.01~0.02 几乎不动 / 0.05 明显流动
     FLAME_ITERATIONS   干涉纹理迭代次数
                        ↓ 越少图案越简单稳定、开销越低：6~8 更稳 / 10 更丰富
     ============================================================ */
  const FLAME_NOISE_SPEED = 0
  const FLAME_WOBBLE = 0
  const FLAME_DRIFT = 0
  const FLAME_ITERATIONS = 0

  /* ============================================================
     ✋ 微调区（B）—— 流星运动 / 淡入淡出 / 尺寸 / 拖尾造型
     ------------------------------------------------------------
     TIME_SCALE      送入着色器的动画时间倍率（越小火焰越慢越安静，0.5=减半）
     FADE_IN_TIME    淡入秒数（越小“唰”地出现，也减少画面中间淡入带来的闪）
     FADE_OUT_TIME   淡出秒数（越大结尾越柔和）
     DIST_REF        四边形尺寸参考距离（越大远处流星越大、越清晰，亚像素闪烁越少）
     DIST_MIN_SCALE  尺寸下限（越大远处流星保持越大）
     TAIL_DECAY      彗尾衰减系数（越小尾巴越长）
     HEAD_SIZE       头部光点衰减系数 exp(-HEAD_SIZE*d)（越小头部越大越亮）
     HEAD_POS        头部在运动方向前方（+x）的偏移（相对中心）
     BAND_EDGE       火焰条带侧向收窄边界（越小尾巴越细）
     SAFE_DEPTH      起点安全深度（越小越贴近相机；过小会重新出现方块闪烁）
     ============================================================ */
  const TIME_SCALE = 0.6
  const FADE_IN_TIME = 0.15
  const FADE_OUT_TIME = 0.35
  const DIST_REF = 1200
  const DIST_MIN_SCALE = 0.4
  const TAIL_DECAY = 0.15
  const HEAD_SIZE = 4.0
  const HEAD_POS = 1.5
  const BAND_EDGE = 5.0
  const SAFE_DEPTH = 80

  /* ---------------------------------------------------------------------------
     流星配置 / 辐射点模式状态（控制面板可实时调整）
     --------------------------------------------------------------------------- */
  let cfg: MeteorConfig = { ...METEOR_CONFIG_DEFAULTS, ...config }

  /** 数值钳制（屏幕 NDC 范围用） */
  const clampNum = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  /** 待生成流星队列项：辐射点模式下错峰生成的一颗流星 */
  interface BurstSpec {
    delay: number
    speedMul: number
    entry: THREE.Vector3
    landing: THREE.Vector3
  }

  /** 更新配置（与默认值合并并钳制，实时生效） */
  function setConfig(partial: Partial<MeteorConfig>) {
    cfg = { ...cfg, ...partial }
    cfg.radiantBurst = clampNum(Math.round(cfg.radiantBurst), 1, 6)
    cfg.radiantSpread = clampNum(cfg.radiantSpread, 0.2, 2.0)
  }

  // 辐射点模式：当前辐射点（屏幕 NDC）与待生成队列
  let radiant: { x: number; y: number } | null = null
  let burstQueue: BurstSpec[] = []

  /* ---------------------------------------------------------------------------
     effect_01.wgsl 共享着色器函数（TSL 移植）
     --------------------------------------------------------------------------- */

  /** 伪随机（哈希） */
  const random2d = Fn(([p]: any) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453123)))

  /** 二维平滑噪声 */
  const noise2 = Fn(([p]: any) => {
    const i = floor(p)
    const f = fract(p)
    const a = random2d(i)
    const b = random2d(i.add(vec2(1.0, 0.0)))
    const c = random2d(i.add(vec2(0.0, 1.0)))
    const d = random2d(i.add(vec2(1.0, 1.0)))
    const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)))
    const nx0 = mix(a, b, u.x)
    const nx1 = mix(c, d, u.x)
    return mix(nx0, nx1, u.y)
  })

  /** 向量版 tanh 近似 */
  const tanhVec4 = Fn(([x]: any) => {
    const e2x = exp(x.mul(2.0))
    return e2x.sub(1.0).div(e2x.add(1.0))
  })

  /** 构建流星拖尾 fragment（每颗流星绑定自己的一套 uniform） */
  function buildMeteorFragment(
    uTime: ReturnType<typeof uniform>,
    uAnim: ReturnType<typeof uniform>,
    uScale: ReturnType<typeof uniform>,
    uAspect: ReturnType<typeof uniform>,
    uFade: ReturnType<typeof uniform>,
    uColor: ReturnType<typeof uniform>,
  ) {
    return Fn(() => {
      // 居中 UV（quad 局部 0..1）
      const centered = uv().sub(vec2(0.5, 0.5))

      // 缩放进入着色器坐标空间；四边形沿飞行方向（x）拉长，
      // 用 uAspect（宽/长）补偿 y 轴，避免火焰在窄方向被压得过扁
      const p = vec2(centered.x.mul(uScale), centered.y.mul(uScale).div(uAspect)).toVar()

      // 噪声扰动：漂移速度由微调区 FLAME_NOISE_SPEED 控制（↓ 更安静不闪）
      const f = float(3.0).add(noise2(p.add(vec2(uTime.mul(FLAME_NOISE_SPEED), 0.0))))

      // 干涉纹理累积（迭代次数 FLAME_ITERATIONS，↓ 更简单稳定）；
      // weight 幅度由 FLAME_WOBBLE 控制（↓ 亮度更稳防频闪）
      const o = vec4(0.0).toVar()
      const v = p.toVar()
      Loop(FLAME_ITERATIONS, ({ i }: any) => {
        const ii = float(i)
        const phase = ii.mul(ii).add(uTime.add(p.x.mul(0.1)).mul(FLAME_DRIFT))
        v.assign(p.add(cos(vec2(phase, phase).add(ii.mul(vec2(11.0, 9.0)))).mul(5.0)))
        const colScale = cos(sin(ii).mul(vec4(1.0, 2.0, 3.0, 1.0))).add(vec4(1.0))
        const weight = exp(sin(ii.mul(ii).add(uTime)).mul(FLAME_WOBBLE))
        const denom = length(max(v, vec2(v.x.mul(f).mul(0.02), v.y)))
        o.addAssign(colScale.mul(weight).div(denom))
      })

      // tanh 色调映射（提升暗部、抑制高亮 → 柔和饱和的尾焰）
      const col = tanhVec4(pow(o.div(100.0), vec4(1.5))).toVar()

      // 火焰动画开关：关（uAnim=0）时丢弃干涉累积 → 火焰退化为平滑彗尾+头部，
      // 彻底消除高亮“亮格”随高速飞行扫过屏幕产生的闪烁方块；开（uAnim=1）恢复
      col.mulAssign(uAnim)

      // 平滑长彗尾：从头部沿 -x（身后）衰减，长度由 TAIL_DECAY 控制（↓ 越长）
      const streak = exp(p.x.sub(0.6).mul(TAIL_DECAY))
        .mul(smoothstep(1.2, 0.0, p.x)) // 前方（头部之后）熄灭
        .mul(exp(abs(p.y).mul(-0.25)))
      col.addAssign(vec4(1.0, 0.92, 0.85, 1.0).mul(streak).mul(0.6))

      // 统一形状蒙版：尾部（-x）长拖尾渐隐；前方（超出头部区域）熄灭；侧向收窄成条
      const tail = smoothstep(-8.0, 0.6, p.x)
      const front = smoothstep(2.0, 0.6, p.x) // p.x>2 熄灭，p.x<0.6 全亮
      const band = smoothstep(BAND_EDGE, 1.5, abs(p.y)) // 侧向收窄（BAND_EDGE 越大越宽）
      col.mulAssign(tail.mul(front).mul(band))

      // 头部：小而亮的炽热点，位于运动方向前方（+x 偏移 HEAD_POS），大小由 HEAD_SIZE 控制
      const head = exp(length(p.sub(vec2(HEAD_POS, 0.0))).mul(-HEAD_SIZE))
      col.addAssign(vec4(1.0, 0.95, 0.9, 1.0).mul(head).mul(1.2))

      // 颜色染色 + 生命周期淡入淡出（alpha 取亮度，供透明排序）
      const tinted = col.xyz.mul(uColor).mul(uFade)
      const alpha = clamp(max(max(tinted.x, tinted.y), tinted.z), 0.0, 1.0)
      return vec4(tinted, alpha)
    })()
  }

  interface Meteor {
    active: boolean
    age: number
    /** 静态火焰时的固定相位（关闭动画时每颗流星图案不同） */
    staticPhase: number
    life: number
    lifeTotal: number
    pos: THREE.Vector3
    vel: THREE.Vector3
    mesh: THREE.Mesh
    geometry: THREE.PlaneGeometry
    material: THREE.MeshBasicNodeMaterial
    uTime: ReturnType<typeof uniform>
    uAnim: ReturnType<typeof uniform>
    uScale: ReturnType<typeof uniform>
    uAspect: ReturnType<typeof uniform>
    uFade: ReturnType<typeof uniform>
    uColor: ReturnType<typeof uniform>
  }

  /** 创建一个流星（公告牌着色器四边形），初始不可见 */
  function createMeteor(): Meteor {
    const geometry = new THREE.PlaneGeometry(1, 1)

    // 每颗流星独立的 uniform（时间/尺寸/透明度/颜色），保证各自火焰不同步
    const uTime = uniform(0.0)
    // 火焰动画开关：1 = 干涉火焰流动 | 0 = 平滑彗尾静态（默认关闭，无闪烁方块）
    const uAnim = uniform(0.0)
    // 缩放随拖尾长度同步放大（1 p.x ≈ 20 世界单位），保持火焰纹理密度
    const uScale = uniform(16.0)
    const uAspect = uniform(TRAIL_WIDTH / TRAIL_LEN)
    const uFade = uniform(0.0)
    const uColor = uniform(new THREE.Color(0.72, 0.86, 1.0))

    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    material.fragmentNode = buildMeteorFragment(uTime, uAnim, uScale, uAspect, uFade, uColor)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = 10
    mesh.visible = false
    scene.add(mesh)

    return {
      active: false,
      age: 0,
      staticPhase: 0,
      life: 0,
      lifeTotal: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      mesh, geometry, material, uTime, uAnim, uScale, uAspect, uFade, uColor,
    }
  }

  // ---- 流星池 ----
  const meteors: Meteor[] = []
  for (let i = 0; i < POOL_SIZE; i++) meteors.push(createMeteor())

  const tmp = new THREE.Vector3()
  // 运动方向定向计算用临时对象
  const tmpUp = new THREE.Vector3()
  const tmpView = new THREE.Vector3()
  const tmpQuat = new THREE.Quaternion()
  const tmpMatrix = new THREE.Matrix4()
  let timer = 4 + Math.random() * 8 // 自动出现的首次延迟

  /** 屏幕 NDC 坐标 → 从相机出发的世界方向 */
  function ndcToWorldDir(ndcX: number, ndcY: number, out: THREE.Vector3) {
    camera.updateMatrixWorld()
    out.set(ndcX, ndcY, 0.5).unproject(camera)
    out.sub(camera.position).normalize()
    return out
  }

  /** 将屏幕 NDC 坐标投影为相机前方指定深度处的世界点 */
  function ndcToWorld(ndcX: number, ndcY: number, depth: number, out: THREE.Vector3) {
    ndcToWorldDir(ndcX, ndcY, out)
    out.multiplyScalar(depth).add(camera.position)
    return out
  }

  /** 保证头部/落点世界高度在海平面之上，避免四边形切入海面造成闪烁 */
  function ensureAboveSea(p: THREE.Vector3) {
    if (p.y < SKY_WORLD_MIN_Y) p.y = SKY_WORLD_MIN_Y
  }

  /** 按给定 进入点/落点 生成一颗流星：沿反向延伸出屏幕外，飞向落点（横穿或飞远） */
  function spawn(m: Meteor, entry: THREE.Vector3, landing: THREE.Vector3, speedMul = 1) {
    camera.updateMatrixWorld()

    // 飞行方向：从进入点指向落点（横穿屏幕或飞向远方）
    tmp.copy(landing).sub(entry).normalize()

    // 起点：沿反方向延伸出屏幕外/相机后方 → 营造“从画面外划出”
    m.pos.copy(entry).addScaledVector(tmp, -BEHIND_LEN)

    // 安全护栏：起点不得在相机后方（沿视线前移，保持屏幕外投影不变），
    // 避免超大四边形在出现瞬间穿过近平面 → 方块闪烁。
    // 深度阈值由微调区 SAFE_DEPTH 控制（过小会重新出现方块闪烁）
    camera.getWorldDirection(tmpView)
    const startDepth = tmpView.dot(m.pos) - tmpView.dot(camera.position)
    if (startDepth < SAFE_DEPTH) {
      m.pos.addScaledVector(tmpView, SAFE_DEPTH - startDepth)
    }

    const speed = (SPEED_BASE + Math.random() * SPEED_RANGE) * speedMul
    m.vel.copy(tmp).multiplyScalar(speed)

    // 生命周期 = 从背后起点到落点全程（略留余量，到达后自然淡出回收）
    m.lifeTotal = (m.pos.distanceTo(landing) / speed) * 1.1
    m.life = m.lifeTotal
    m.age = 0 // 着色器局部时间从 0 起算（每颗流星火焰不同步）
    // 静态火焰的固定相位（关闭动画时每颗流星的火焰图案不同）
    m.staticPhase = Math.random() * Math.PI * 2
    // 随机选择红/白两种流星颜色（对应 effect_01.wgsl 的红白双色）
    m.uColor.value.copy(METEOR_COLORS[(Math.random() * METEOR_COLORS.length) | 0])
    m.active = true
    m.mesh.visible = true
  }

  /**
   * 飞行轨迹（random 模式）——流星始终保持在“海平面之上”的天空区域：
   * 左右两侧互相飞：从左侧/右侧屏幕外进入，水平飞向对侧屏幕外（左→右 或 右→左），
   * 距离镜头很远（深度 1500~3200），出画后淡出。
   */
  function randomSpec(): BurstSpec {
    camera.updateMatrixWorld()

    // 左→右 或 右→左（随机交替，形成互相飞行的流星）
    const fromLeft = Math.random() < 0.5
    const height = 0.25 + Math.random() * 0.4 // 屏幕上方高度（NDC y，海平面之上）
    const jitter = (Math.random() - 0.5) * 0.15 // 出画高度微扰，轨迹略带倾角
    // 以基准深度为中心，入/出画深度只做小幅扰动：保持近似恒深 → 轨迹近似水平，
    // 避免入/出画深度差过大导致起点跑到相机后方，出现大四边形方块闪烁
    const baseDepth = SKY_DIST_MIN + Math.random() * SKY_DIST_RANGE
    const entryDepth = baseDepth + (Math.random() - 0.5) * 120
    const exitDepth = baseDepth + (Math.random() - 0.5) * 120

    const entry = new THREE.Vector3()
    ndcToWorld(fromLeft ? -CROSS_EXIT_X : CROSS_EXIT_X, height, entryDepth, entry)
    ensureAboveSea(entry)

    const landing = new THREE.Vector3()
    ndcToWorld(fromLeft ? CROSS_EXIT_X : -CROSS_EXIT_X, height + jitter, exitDepth, landing)
    ensureAboveSea(landing)

    // 横穿速度略快，轨迹干脆利落
    return { delay: 0, speedMul: 0.95 + Math.random() * 0.3, entry, landing }
  }

  /** 辐射点模式轨迹：从当前辐射点附近出现，向下方/两侧扇形发散射向远方（海平面之上） */
  function radiantSpec(): BurstSpec {
    if (!radiant) pickRadiant()
    const r = radiant!

    // 进入点：在辐射点附近小范围扰动（可见起点贴近辐射点，拖尾自然指向辐射点）
    const entryX = clampNum(r.x + (Math.random() - 0.5) * 0.1, -0.92, 0.92)
    const entryY = clampNum(r.y + (Math.random() - 0.5) * 0.08 - 0.03, 0.15, 0.98)
    const entryDepth = SKY_DIST_MIN + Math.random() * 1000 // 1500~2500（远距离）
    const entry = new THREE.Vector3()
    ndcToWorld(entryX, entryY, entryDepth, entry)
    ensureAboveSea(entry)

    // 落点：以辐射点为原点，向下方/两侧扇形发散；投影到远深度（海平面之上），
    // 流星向远处飞去并逐渐变暗，不会落入海面造成闪烁
    const landX = clampNum(r.x + (Math.random() - 0.5) * 2 * cfg.radiantSpread, -0.95, 0.95)
    const landY = clampNum(r.y - (0.35 + Math.random() * 0.3), SKY_NDC_MIN, 0.9)
    const landDepth = 2300 + Math.random() * 1300 // 2300~3600（远距离，飞远渐隐）
    const landing = new THREE.Vector3()
    ndcToWorld(landX, landY, landDepth, landing)
    ensureAboveSea(landing)
    // 流星雨整体略慢、速度略有差异，观感更从容
    return { delay: 0, speedMul: 0.85 + Math.random() * 0.25, entry, landing }
  }

  /** 随机选取屏幕上方的一个辐射点（NDC 坐标） */
  function pickRadiant() {
    radiant = {
      x: -0.3 + Math.random() * 0.6, // -0.3 ~ 0.3（上部偏中）
      y: 0.5 + Math.random() * 0.35, // 0.5 ~ 0.85（屏幕上方）
    }
  }

  /** 辐射模式：建立当前辐射点并生成一批流星（队列 + 错峰延迟，形成流星雨） */
  function startBurst() {
    pickRadiant()
    const count = Math.round(cfg.radiantBurst)
    const specs: BurstSpec[] = []
    for (let i = 0; i < count; i++) {
      const s = radiantSpec()
      specs.push({ ...s, delay: i * (0.08 + Math.random() * 0.14) })
    }
    if (specs.length > 0) specs[0].delay = 0 // 第一颗立即出现
    burstQueue = burstQueue.concat(specs).slice(-12) // 最多保留 12 颗待生成
  }

  /** 让流星四边形沿世界运动方向定向（本地 +x = 运动方向，拖尾朝 -x = 身后），
   *  并让面朝向相机。x 锁定在世界运动方向 → 拖尾始终沿运动方向，不随相机旋转。 */
  function orientToMotion(m: Meteor) {
    // 本地 +x = 世界运动方向
    tmp.copy(m.vel).normalize()
    // 面法线朝相机
    tmpView.copy(camera.position).sub(m.pos).normalize()
    // 上 = 法线 × 运动方向；运动方向与视线近平行（飞向/远离镜头）时用世界 Y 兜底
    tmpUp.crossVectors(tmpView, tmp)
    if (tmpUp.lengthSq() < 1e-6) tmpUp.set(0, 1, 0)
    tmpUp.normalize()
    // 重正交化 x，构成右手正交基
    tmp.crossVectors(tmpUp, tmpView).normalize()
    tmpQuat.setFromRotationMatrix(tmpMatrix.makeBasis(tmp, tmpUp, tmpView))
    m.mesh.quaternion.copy(tmpQuat)
  }

  /** 自动生成（定时触发）：辐射模式生成一场流星雨，随机模式生成单颗 */
  function autoSpawn() {
    if (cfg.mode === 'radiant') {
      startBurst()
    } else {
      const slot = meteors.find((m) => !m.active)
      if (slot) {
        const s = randomSpec()
        spawn(slot, s.entry, s.landing, s.speedMul)
      }
    }
  }

  /** 手动触发流星（快捷键 M，可连续触发）：辐射模式连发一场流星雨 */
  function trigger() {
    if (cfg.mode === 'radiant') {
      startBurst()
    } else {
      // 优先空闲槽位；若已满则覆盖第一个，保证每次按键都能触发
      const slot = meteors.find((m) => !m.active) ?? meteors[0]
      const s = randomSpec()
      spawn(slot, s.entry, s.landing, s.speedMul)
    }
  }

  function update(dt: number) {
    // 自动出现的计时（辐射模式每批为一场流星雨，间隔略长）
    timer -= dt
    if (timer <= 0) {
      autoSpawn()
      timer = cfg.mode === 'radiant' ? 9 + Math.random() * 14 : 5 + Math.random() * 12
    }

    // 辐射模式：错峰生成队列中的流星
    if (burstQueue.length > 0) {
      burstQueue[0].delay -= dt
      while (burstQueue.length > 0 && burstQueue[0].delay <= 0) {
        const spec = burstQueue.shift()!
        const slot = meteors.find((m) => !m.active)
        if (slot) {
          spawn(slot, spec.entry, spec.landing, spec.speedMul)
        } else {
          burstQueue.unshift(spec) // 池满，稍后重试
          break
        }
      }
    }

    for (const m of meteors) {
      if (!m.active) continue

      m.life -= dt
      if (m.life <= 0) {
        deactivate(m)
        continue
      }

      // 移动 + 着色器局部时间
      m.pos.addScaledVector(m.vel, dt)
      m.age += dt

      // 淡入淡出：
      //  - 开头快闪
      //  - 生命末尾渐隐
      //  - 接近海面时逐渐变暗（落到海平面消失）
      //  - 距相机过远时淡出（兜底）
      const fadeIn = Math.min(1, (m.lifeTotal - m.life) / FADE_IN_TIME)
      const fadeOut = Math.min(1, m.life / FADE_OUT_TIME)
      const seaFade = Math.max(0, Math.min(1, m.pos.y / SEA_FADE_H))
      const distToCam = m.pos.distanceTo(camera.position)
      const distFade = Math.max(0, Math.min(1, 1 - (distToCam - FADE_DIST) / FADE_RANGE))
      const fade = Math.min(fadeIn, fadeOut, seaFade, distFade)

      // 已完全不可见（落海 / 飞远）→ 提前回收
      if (fade <= 0.01) {
        deactivate(m)
        continue
      }

      // 位置 + 随距离远去整体缩小
      m.mesh.position.copy(m.pos)
      // 尺寸缩放：参考距离 DIST_REF、下限 DIST_MIN_SCALE
      // （两者越大，远处流星越大越清晰，亚像素闪烁越少）
      const distScale = Math.max(DIST_MIN_SCALE, Math.min(1, DIST_REF / Math.max(distToCam, 1)))
      m.mesh.scale.set(TRAIL_LEN * distScale, TRAIL_WIDTH * distScale, 1)

      // 沿世界运动方向定向（拖尾始终指向运动方向，不旋转）
      orientToMotion(m)

      // 更新着色器 uniform：
      //  - 火焰动画开关（关 = 平滑静态彗尾，无干涉亮格 → 无闪烁方块）
      //  - 火焰时间（动画开 = age*TIME_SCALE 流动；关 = 固定相位静态）
      //  - 生命周期淡入淡出由 FADE_IN_TIME / FADE_OUT_TIME 控制
      m.uAnim.value = cfg.flameAnim ? 1.0 : 0.0
      m.uTime.value = cfg.flameAnim ? m.age * TIME_SCALE : m.staticPhase
      m.uFade.value = fade
    }
  }

  function deactivate(m: Meteor) {
    m.active = false
    m.uFade.value = 0
    m.mesh.visible = false
  }

  /** 离开 Clear 夜晚时重置 */
  function reset() {
    for (const m of meteors) deactivate(m)
    burstQueue = []
    radiant = null
    timer = cfg.mode === 'radiant' ? 6 + Math.random() * 8 : 5 + Math.random() * 10
  }

  function dispose() {
    for (const m of meteors) {
      scene.remove(m.mesh)
      m.geometry.dispose()
      m.material.dispose()
    }
  }

  // 对外暴露的流星系统接口（与 OpenSea.vue 保持一致）
  // update/reset/dispose/trigger/setConfig
  return { update, reset, dispose, trigger, setConfig }
}
