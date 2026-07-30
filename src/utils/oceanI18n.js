/**
 * Open Sea i18n — English / Chinese localization
 */
export const L10N = {
  en: {
    'panel.eyebrow': 'Realtime Ocean',
    'panel.subtitle': 'Gerstner swell · FBM micro-surface · spectral sky · Boids fish system',
    'panel.seaState': 'Sea State',
    'panel.timeOfDay': 'Time of Day',

    'panel.hint': 'DRAG TO ORBIT — SCROLL TO ZOOM',
    'time.dawn': 'DAWN',
    'time.dusk': 'DUSK',
    'time.midday': 'MIDDAY',
    'time.midnight': 'MIDNIGHT',
    'quality.adaptive': 'ADAPTIVE',
    'quality.ultraHd': 'ULTRA HD',
    'quality.bench': 'BENCH',
    'quality.max': 'MAX',
    'tier.0': 'Ultra',
    'tier.1': 'High',
    'tier.2': 'Medium',
    'tier.3': 'Low',
    'tier.4': 'Potato',

    // Fish school controls
    'fish.title': 'FISH SCHOOL',
    'fish.sardineCount': 'Sardines',
    'fish.koiCount': 'Koi',
    'fish.perception': 'Perception',
    'fish.sardineSpeed': 'Sardine Speed',
    'fish.separation': 'Separation',
    'fish.avoidance': 'Avoidance',
    'fish.turnRate': 'Turn Rate',
    'fish.topMargin': 'Top Avoid',
    'fish.koiGroup': 'KOI',
    'fish.koiPerception': 'Koi Perception',
    'fish.koiSpeed': 'Koi Speed',
    'fish.koiSeparation': 'Koi Separation',
    'fish.koiAvoidance': 'Koi Avoid',
    'fish.koiTurnRate': 'Koi Turn Rate',
    'fish.koiTopMargin': 'Koi Top Avoid',
    'fish.cameraToggle': 'Space: Fish Cam',
    'panel.aquariumSize': 'Aquarium Size',
    'panel.showBoundary': 'Show Boundary',
  },
  zh: {
    'panel.eyebrow': '实时海洋',
    'panel.subtitle': '格斯特纳涌浪 · FBM微表面 · 光谱天空 · Boids鱼群模拟',
    'panel.seaState': '海况',
    'panel.timeOfDay': '时段',

    'panel.hint': '拖拽旋转 — 滚轮缩放',
    'time.dawn': '晨曦',
    'time.dusk': '黄昏',
    'time.midday': '正午',
    'time.midnight': '午夜',
    'quality.adaptive': '自适应',
    'quality.ultraHd': '超高清',
    'quality.bench': '测试',
    'quality.max': '最高',
    'tier.0': '极致',
    'tier.1': '高',
    'tier.2': '中',
    'tier.3': '低',
    'tier.4': '基础',

    // Fish school controls
    'fish.title': '🐟 鱼群',
    'fish.sardineCount': '沙丁鱼数量',
    'fish.koiCount': '锦鲤数量',
    'fish.perception': '感知范围',
    'fish.sardineSpeed': '沙丁鱼速度',
    'fish.separation': '分离强度',
    'fish.avoidance': '避障强度',
    'fish.turnRate': '转向速度',
    'fish.topMargin': '顶部回避',
    'fish.koiGroup': '锦鲤',
    'fish.koiPerception': '锦鲤感知范围',
    'fish.koiSpeed': '锦鲤速度',
    'fish.koiSeparation': '锦鲤分离强度',
    'fish.koiAvoidance': '锦鲤避障强度',
    'fish.koiTurnRate': '锦鲤转向速度',
    'fish.koiTopMargin': '锦鲤顶部回避',
    'fish.cameraToggle': '空格: 鱼眼相机',
    'panel.aquariumSize': '鱼缸大小',
    'panel.showBoundary': '显示边框',
  }
}

export function t(lang, key) {
  return (L10N[lang] && L10N[lang][key]) || (L10N.en[key]) || key
}
