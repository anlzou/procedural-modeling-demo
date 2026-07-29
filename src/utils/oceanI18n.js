/**
 * Open Sea i18n — English / Chinese localization
 */
export const L10N = {
  en: {
    'panel.eyebrow': 'Realtime Ocean',
    'panel.subtitle': 'Gerstner swell · FBM micro-surface · spectral sky',
    'panel.seaState': 'Sea State',
    'panel.timeOfDay': 'Time of Day',
    'panel.drift': 'Drift',
    'panel.uhd': 'Ultra HD',
    'panel.hint': 'DRAG TO ORBIT — SCROLL TO ZOOM',
    'time.dusk': 'DUSK',
    'time.golden': 'GOLDEN HOUR',
    'time.afternoon': 'AFTERNOON',
    'time.midday': 'MIDDAY',
    'quality.adaptive': 'ADAPTIVE',
    'quality.ultraHd': 'ULTRA HD',
    'quality.bench': 'BENCH',
    'quality.max': 'MAX',
    'tier.0': 'Ultra',
    'tier.1': 'High',
    'tier.2': 'Medium',
    'tier.3': 'Low',
    'tier.4': 'Potato',
  },
  zh: {
    'panel.eyebrow': '实时海洋',
    'panel.subtitle': '格斯特纳涌浪 · FBM微表面 · 光谱天空',
    'panel.seaState': '海况',
    'panel.timeOfDay': '时段',
    'panel.drift': '漫游',
    'panel.uhd': '超高清',
    'panel.hint': '拖拽旋转 — 滚轮缩放',
    'time.dusk': '黄昏',
    'time.golden': '黄金时段',
    'time.afternoon': '午后',
    'time.midday': '正午',
    'quality.adaptive': '自适应',
    'quality.ultraHd': '超高清',
    'quality.bench': '测试',
    'quality.max': '最高',
    'tier.0': '极致',
    'tier.1': '高',
    'tier.2': '中',
    'tier.3': '低',
    'tier.4': '基础',
  }
}

export function t(lang, key) {
  return (L10N[lang] && L10N[lang][key]) || (L10N.en[key]) || key
}
