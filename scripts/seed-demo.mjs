import { randomUUID } from 'node:crypto'

const origin = process.env.WORDFLOW_ORIGIN || 'http://127.0.0.1:5173'
const requestedCount = Number.parseInt(process.argv[2] || '100', 10)
const requestedConcurrency = Number.parseInt(process.env.SEED_CONCURRENCY || '20', 10)

if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 1000) {
  throw new Error('生成数量必须是 1–1000 之间的整数')
}
if (!Number.isInteger(requestedConcurrency) || requestedConcurrency < 1 || requestedConcurrency > 100) {
  throw new Error('并发数必须是 1–100 之间的整数')
}

const optionWeights = new Map([
  ['期待', 18],
  ['兴奋', 15],
  ['好奇', 13],
  ['开心', 11],
  ['激动', 9],
  ['新鲜', 8],
  ['憧憬', 7],
  ['充满希望', 6],
  ['自信', 5],
  ['放松', 5],
  ['紧张', 5],
  ['忐忑', 4],
  ['迷茫', 3],
  ['陌生', 3],
  ['不安', 3],
  ['压力', 3],
  ['挑战', 4],
  ['归属感', 5],
  ['幸运', 6],
  ['充实', 5],
  ['坡比想象中多', 18],
  ['每天要走这么多路', 15],
  ['晚课结束得这么晚', 12],
  ['这么快就迎来DDL', 16],
  ['活动可以有这么多', 14],
  ['图书馆座位比双十一还难抢', 11],
  ['教室冷的像冰窖', 10],
  ['找教室全靠缘分', 12],
  ['成为熬夜冠军', 9],
])

const customMoods = [
  '惊喜',
  '温暖',
  '感动',
  '热血',
  '雀跃',
  '安心',
  '向往',
  '有动力',
]

const customSurprises = [
  '校园像一座立体迷宫',
  '电梯也需要排队',
  '同学来自这么多地方',
  '学习节奏比想象中快',
  '学校夜景很好看',
  '社团活动特别丰富',
  '一天能走两万步',
  '教学楼之间这么绕',
]

function pickWeighted(options, excluded) {
  const candidates = options
    .filter((option) => !excluded.has(option))
    .map((option) => [option, optionWeights.get(option) || 1])
  const totalWeight = candidates.reduce((sum, [, weight]) => sum + weight, 0)
  let cursor = Math.random() * totalWeight

  for (const [option, weight] of candidates) {
    cursor -= weight
    if (cursor <= 0) return option
  }
  return candidates.at(-1)[0]
}

function createRandomAnswer(question) {
  const presetOptions = question.options.filter((option) => option !== '其他')
  const canUseOther = question.allowOther && question.options.includes('其他')
  const customAnswers = question.variant === 'b' ? customSurprises : customMoods
  const useCustomAnswer = canUseOther && Math.random() < 0.12

  if (question.type === 'single-choice') {
    if (useCustomAnswer) {
      return {
        selectedOptions: ['其他'],
        otherText: customAnswers[Math.floor(Math.random() * customAnswers.length)],
      }
    }
    return { selectedOptions: [pickWeighted(presetOptions, new Set())], otherText: '' }
  }

  const roll = Math.random()
  const selectionCount = roll < 0.5 ? 1 : roll < 0.88 ? 2 : 3
  const fixedCount = Math.max(0, selectionCount - (useCustomAnswer ? 1 : 0))
  const selected = new Set()

  while (selected.size < fixedCount) selected.add(pickWeighted(presetOptions, selected))

  if (!useCustomAnswer) return { selectedOptions: [...selected], otherText: '' }

  return {
    selectedOptions: [...selected, '其他'],
    otherText: customAnswers[Math.floor(Math.random() * customAnswers.length)],
  }
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
  return payload
}

const initialState = await readJson(await fetch(`${origin}/api/state`))
if (!['multiple-choice', 'single-choice'].includes(initialState.question?.type)) {
  throw new Error('当前服务题型无法识别，请先重启 npm run dev')
}

const initialCount = initialState.responses.length
const runId = `${Date.now()}-${randomUUID()}`

async function submitRandomAnswer(index) {
  const answer = createRandomAnswer(initialState.question)
  const response = await fetch(`${origin}/api/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...answer,
      questionId: initialState.question.id,
      sessionId: `demo-${runId}-${index + 1}`,
    }),
  })
  await readJson(response)
}

for (let offset = 0; offset < requestedCount; offset += requestedConcurrency) {
  const batchSize = Math.min(requestedConcurrency, requestedCount - offset)
  await Promise.all(Array.from(
    { length: batchSize },
    (_, index) => submitRandomAnswer(offset + index),
  ))
}

const finalState = await readJson(await fetch(`${origin}/api/state`))
const addedCount = finalState.responses.length - initialCount

if (addedCount !== requestedCount) {
  throw new Error(`预期新增 ${requestedCount} 份，实际新增 ${addedCount} 份`)
}

console.log(`✓ 已随机新增 ${addedCount} 份回答`)
console.log(`✓ 当前总回答数：${finalState.responses.length}`)
console.log(`✓ 题型：${initialState.question.type === 'single-choice' ? '单选' : '多选'}，并发数：${requestedConcurrency}`)
console.log(`✓ 刷新 ${origin}/ 即可查看词云`)
