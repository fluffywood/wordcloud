import { randomUUID } from 'node:crypto'

const origin = process.env.WORDFLOW_ORIGIN || 'http://127.0.0.1:5173'
const requestedCount = Number.parseInt(process.argv[2] || '100', 10)

if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 1000) {
  throw new Error('生成数量必须是 1–1000 之间的整数')
}

const weightedMoods = [
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
]

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

function pickWeighted(excluded) {
  const candidates = weightedMoods.filter(([mood]) => !excluded.has(mood))
  const totalWeight = candidates.reduce((sum, [, weight]) => sum + weight, 0)
  let cursor = Math.random() * totalWeight

  for (const [mood, weight] of candidates) {
    cursor -= weight
    if (cursor <= 0) return mood
  }
  return candidates.at(-1)[0]
}

function createRandomAnswer() {
  const roll = Math.random()
  const selectionCount = roll < 0.5 ? 1 : roll < 0.88 ? 2 : 3
  const useCustomMood = Math.random() < 0.12
  const fixedCount = Math.max(0, selectionCount - (useCustomMood ? 1 : 0))
  const selected = new Set()

  while (selected.size < fixedCount) selected.add(pickWeighted(selected))

  if (!useCustomMood) return { selectedOptions: [...selected], otherText: '' }

  return {
    selectedOptions: [...selected, '其他'],
    otherText: customMoods[Math.floor(Math.random() * customMoods.length)],
  }
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
  return payload
}

const initialState = await readJson(await fetch(`${origin}/api/state`))
if (initialState.question?.type !== 'multiple-choice') {
  throw new Error('当前服务不是新的多选版本，请先重启 npm run dev')
}

const initialCount = initialState.responses.length
const runId = `${Date.now()}-${randomUUID()}`

for (let index = 0; index < requestedCount; index += 1) {
  const answer = createRandomAnswer()
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

const finalState = await readJson(await fetch(`${origin}/api/state`))
const addedCount = finalState.responses.length - initialCount

if (addedCount !== requestedCount) {
  throw new Error(`预期新增 ${requestedCount} 份，实际新增 ${addedCount} 份`)
}

console.log(`✓ 已随机新增 ${addedCount} 份回答`)
console.log(`✓ 当前总回答数：${finalState.responses.length}`)
console.log(`✓ 刷新 ${origin}/ 即可查看词云`)
