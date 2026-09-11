export const DEFAULT_POLL_VARIANT = 'a'
export const OTHER_OPTION = '其他'

const POLL_CONFIGS = {
  a: {
    version: 2,
    question: '初见CityU，你此刻的心情是？',
    selectionMode: 'multiple',
    otherMaxLength: 6,
    presetOptions: [
      '期待',
      '兴奋',
      '好奇',
      '开心',
      '激动',
      '新鲜',
      '憧憬',
      '充满希望',
      '自信',
      '放松',
      '紧张',
      '忐忑',
      '迷茫',
      '陌生',
      '不安',
      '压力',
      '挑战',
      '归属感',
      '幸运',
      '充实',
    ],
  },
  b: {
    version: 2,
    question: '来到CityU以后，我最没想到的是：',
    selectionMode: 'single',
    otherMaxLength: null,
    presetOptions: [
      '坡比想象中多',
      '每天要走这么多路',
      '晚课结束得这么晚',
      '这么快就迎来DDL',
      '活动可以有这么多',
      '图书馆座位比双十一还难抢',
      '教室冷的像冰窖',
      '找教室全靠缘分',
      '成为熬夜冠军',
    ],
  },
}

export function getPollConfig(requestedVariant = DEFAULT_POLL_VARIANT) {
  const normalizedVariant = String(requestedVariant || DEFAULT_POLL_VARIANT).trim().toLowerCase()
  const variant = Object.hasOwn(POLL_CONFIGS, normalizedVariant)
    ? normalizedVariant
    : DEFAULT_POLL_VARIANT
  const config = POLL_CONFIGS[variant]

  return {
    ...config,
    variant,
    presetOptions: [...config.presetOptions],
    options: [...config.presetOptions, OTHER_OPTION],
  }
}

const defaultPoll = getPollConfig()

export const POLL_VERSION = defaultPoll.version
export const POLL_QUESTION = defaultPoll.question
export const PRESET_OPTIONS = defaultPoll.presetOptions
export const POLL_OPTIONS = defaultPoll.options
export const OTHER_MAX_LENGTH = defaultPoll.otherMaxLength
