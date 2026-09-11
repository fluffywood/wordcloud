import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { connect } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  OTHER_OPTION,
  POLL_OPTIONS,
  POLL_QUESTION,
  POLL_VERSION,
  getPollConfig,
} from '../src/config/pollConfig.js'
import { aggregateAnswers } from '../src/lib/aggregateAnswers.js'
import { countGraphemes } from '../src/lib/text.js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const temporaryDirectory = await fs.mkdtemp(path.join(tmpdir(), 'wordflow-smoke-'))
const dataFile = path.join(temporaryDirectory, 'poll.json')
const port = 53000 + Math.floor(Math.random() * 1000)
const origin = `http://127.0.0.1:${port}`
const adminKey = 'wordflow-smoke-test-key'
let serverProcess
let serverOutput = ''

function startServer(pollVariant = 'a') {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      ADMIN_KEY: adminKey,
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      POLL_VARIANT: pollVariant,
      PORT: String(port),
      PUBLIC_URL: origin,
      WORDCLOUD_DATA_FILE: dataFile,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => { serverOutput += chunk })
  child.stderr.on('data', (chunk) => { serverOutput += chunk })
  return child
}

async function waitForServer() {
  const deadline = Date.now() + 8_000
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Server exited early:\n${serverOutput}`)
    try {
      const response = await fetch(`${origin}/api/health`)
      if (response.ok) return
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
  throw new Error(`Timed out waiting for server:\n${serverOutput}`)
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return
  const stopped = new Promise((resolve) => serverProcess.once('exit', resolve))
  serverProcess.kill('SIGTERM')
  await Promise.race([
    stopped,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Server did not stop')), 4_000)),
  ])
}

async function api(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const payload = await response.json()
  return { response, payload }
}

function submission(questionId, sessionId, selectedOptions, otherText = '') {
  return {
    method: 'POST',
    body: JSON.stringify({ questionId, sessionId, selectedOptions, otherText }),
  }
}

function rawHttp(payload) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port }, () => socket.write(payload))
    let output = ''
    socket.setEncoding('utf8')
    socket.on('data', (chunk) => { output += chunk })
    socket.on('end', () => resolve(output))
    socket.on('error', reject)
  })
}

function createSseStateReader(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  return async function nextState() {
    while (true) {
      const { done, value } = await reader.read()
      if (done) throw new Error('SSE connection closed before a state event arrived')
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''
      for (const block of blocks) {
        if (!block.includes('event: state')) continue
        const dataLine = block.split('\n').find((line) => line.startsWith('data: '))
        if (dataLine) return JSON.parse(dataLine.slice(6))
      }
    }
  }
}

try {
  serverProcess = startServer()
  await waitForServer()

  const initial = await api('/api/state?sessionId=person-a')
  assert.equal(initial.response.status, 200)
  assert.equal(initial.payload.question.text, POLL_QUESTION)
  assert.equal(initial.payload.question.type, 'multiple-choice')
  assert.deepEqual(initial.payload.question.options, POLL_OPTIONS)
  assert.equal(initial.payload.question.otherMaxLength, 6)
  assert.equal(initial.payload.joinUrl, `${origin}/join`)
  assert.deepEqual(initial.payload.responses, [])

  const hostPage = await fetch(`${origin}/`)
  assert.equal(hostPage.status, 200)
  assert.match(await hostPage.text(), /WordFlow · 实时互动词云/)
  const joinPage = await fetch(`${origin}/join`)
  assert.equal(joinPage.status, 200)
  assert.match(await joinPage.text(), /id="root"/)
  const moderationPage = await fetch(`${origin}/moderate`)
  assert.equal(moderationPage.status, 200)
  assert.match(await moderationPage.text(), /id="root"/)

  const malformed = await rawHttp(`GET http://[ HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`)
  assert.match(malformed, /HTTP\/1\.1 400/)
  assert.equal((await api('/api/health')).response.status, 200)
  assert.equal((await api('/api/responses', { method: 'POST', body: 'null' })).response.status, 400)

  const eventController = new AbortController()
  const eventResponse = await fetch(`${origin}/api/events?sessionId=person-a`, { signal: eventController.signal })
  assert.equal(eventResponse.status, 200)
  assert.match(eventResponse.headers.get('content-type'), /text\/event-stream/)
  const nextEventState = createSseStateReader(eventResponse.body)
  assert.equal((await nextEventState()).responses.length, 0)

  const stale = await api('/api/responses', submission('stale-id', 'person-a', ['期待']))
  assert.equal(stale.response.status, 409)
  assert.equal(stale.payload.code, 'QUESTION_CHANGED')

  const invalidSubmissions = [
    { session: 'invalid-old', body: { text: '绕过接口', questionId: initial.payload.question.id, sessionId: 'invalid-old' } },
    { session: 'invalid-empty', body: { selectedOptions: [], questionId: initial.payload.question.id, sessionId: 'invalid-empty' } },
    { session: 'invalid-unknown', body: { selectedOptions: ['伪造选项'], questionId: initial.payload.question.id, sessionId: 'invalid-unknown' } },
    { session: 'invalid-duplicate', body: { selectedOptions: ['期待', '期待'], questionId: initial.payload.question.id, sessionId: 'invalid-duplicate' } },
    { session: 'invalid-other-empty', body: { selectedOptions: [OTHER_OPTION], otherText: '   ', questionId: initial.payload.question.id, sessionId: 'invalid-other-empty' } },
    { session: 'invalid-other-long', body: { selectedOptions: [OTHER_OPTION], otherText: '一二三四五六七', questionId: initial.payload.question.id, sessionId: 'invalid-other-long' } },
    { session: 'invalid-other-hidden', body: { selectedOptions: [OTHER_OPTION], otherText: '\u200B', questionId: initial.payload.question.id, sessionId: 'invalid-other-hidden' } },
    { session: 'invalid-other-unselected', body: { selectedOptions: ['兴奋'], otherText: '惊喜', questionId: initial.payload.question.id, sessionId: 'invalid-other-unselected' } },
  ]
  for (const invalid of invalidSubmissions) {
    const result = await api('/api/responses', { method: 'POST', body: JSON.stringify(invalid.body) })
    assert.equal(result.response.status, 400, invalid.session)
  }
  assert.equal((await api('/api/state')).payload.responses.length, 0)

  const submitted = await api('/api/responses', submission(
    initial.payload.question.id,
    'person-a',
    ['期待', '兴奋'],
  ))
  assert.equal(submitted.response.status, 201)
  assert.deepEqual(submitted.payload.state.ownResponse.answers.map(({ text }) => text), ['期待', '兴奋'])
  assert.equal(submitted.payload.state.responses.length, 1)
  assert.equal('sessionId' in submitted.payload.state.responses[0], false)

  const pushedState = await nextEventState()
  assert.deepEqual(pushedState.responses[0].answers.map(({ text }) => text), ['期待', '兴奋'])
  assert.equal('sessionId' in pushedState.responses[0], false)
  eventController.abort()

  const custom = await api('/api/responses', submission(
    initial.payload.question.id,
    'person-b',
    ['期待', OTHER_OPTION],
    '一二三四五六',
  ))
  assert.equal(custom.response.status, 201)
  assert.equal(custom.payload.state.responses.length, 2)
  assert.deepEqual(custom.payload.state.ownResponse.answers.map(({ text }) => text), ['期待', '一二三四五六'])

  const grouped = aggregateAnswers(custom.payload.state.responses)
  assert.equal(grouped.find(({ text }) => text === '期待').value, 2)
  assert.equal(grouped.find(({ text }) => text === '兴奋').value, 1)
  assert.equal(grouped.find(({ text }) => text === '一二三四五六').value, 1)
  assert.equal(countGraphemes('👩‍👩‍👧‍👦'), 1)

  const duplicate = await api('/api/responses', submission(
    initial.payload.question.id,
    'person-a',
    ['开心'],
  ))
  assert.equal(duplicate.response.status, 409)
  assert.equal(duplicate.payload.code, 'ALREADY_SUBMITTED')

  const unauthorizedModeration = await api('/api/admin/responses')
  assert.equal(unauthorizedModeration.response.status, 401)

  const moderationHeaders = { 'X-Admin-Key': adminKey }
  const moderationList = await api('/api/admin/responses', { headers: moderationHeaders })
  assert.equal(moderationList.response.status, 200)
  assert.equal(moderationList.payload.counts.active, 2)
  assert.equal(moderationList.payload.responses.length, 2)

  const hidden = await api(`/api/admin/responses/${submitted.payload.response.id}`, {
    method: 'PATCH',
    headers: moderationHeaders,
    body: JSON.stringify({ hidden: true }),
  })
  assert.equal(hidden.response.status, 200)
  assert.equal(hidden.payload.counts.active, 1)
  assert.equal(hidden.payload.counts.hidden, 1)
  const hiddenPublicState = await api('/api/state?sessionId=person-a')
  assert.equal(hiddenPublicState.payload.responses.length, 1)
  assert.equal(hiddenPublicState.payload.ownResponse, null)

  const restored = await api(`/api/admin/responses/${submitted.payload.response.id}`, {
    method: 'PATCH',
    headers: moderationHeaders,
    body: JSON.stringify({ hidden: false }),
  })
  assert.equal(restored.response.status, 200)
  assert.equal(restored.payload.counts.active, 2)
  assert.equal(restored.payload.counts.hidden, 0)

  const lockedQuestion = await api('/api/question', {
    method: 'PUT',
    headers: { 'X-Admin-Key': adminKey },
    body: JSON.stringify({ text: '不应成功的问题' }),
  })
  assert.equal(lockedQuestion.response.status, 404)

  await stopServer()
  serverOutput = ''
  serverProcess = startServer()
  await waitForServer()

  const persisted = await api('/api/state?sessionId=person-b')
  assert.equal(persisted.payload.question.text, POLL_QUESTION)
  assert.equal(persisted.payload.responses.length, 2)
  assert.deepEqual(persisted.payload.ownResponse.answers.map(({ text }) => text), ['期待', '一二三四五六'])
  const persistedFile = JSON.parse(await fs.readFile(dataFile, 'utf8'))
  assert.equal(persistedFile.version, POLL_VERSION)
  assert.ok(Array.isArray(persistedFile.responses[0].answers))

  const permanentlyDeleted = await api(`/api/admin/responses/${persisted.payload.responses[0].id}`, {
    method: 'DELETE',
    headers: moderationHeaders,
  })
  assert.equal(permanentlyDeleted.response.status, 200)
  assert.equal(permanentlyDeleted.payload.counts.total, 1)
  assert.equal((await api('/api/state')).payload.responses.length, 1)

  const unauthorizedClear = await api('/api/responses', { method: 'DELETE' })
  assert.equal(unauthorizedClear.response.status, 401)
  const cleared = await api('/api/responses', {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  })
  assert.equal(cleared.response.status, 200)
  assert.deepEqual(cleared.payload.responses, [])

  await stopServer()
  serverOutput = ''
  serverProcess = startServer('b')
  await waitForServer()

  const variantB = getPollConfig('b')
  const bInitial = await api('/api/state?sessionId=repeat-person')
  assert.equal(bInitial.payload.question.text, variantB.question)
  assert.deepEqual(bInitial.payload.question.options, variantB.options)
  assert.equal(bInitial.payload.question.type, 'single-choice')
  assert.equal(bInitial.payload.question.otherMaxLength, null)
  assert.equal(bInitial.payload.question.allowRepeatResponses, true)

  const bMultiple = await api('/api/responses', submission(
    bInitial.payload.question.id,
    'invalid-multiple-person',
    ['坡比想象中多', '活动可以有这么多'],
  ))
  assert.equal(bMultiple.response.status, 400)

  const bFirst = await api('/api/responses', submission(
    bInitial.payload.question.id,
    'repeat-person',
    [OTHER_OPTION],
    '这是一条明显超过六个字的自定义答案',
  ))
  assert.equal(bFirst.response.status, 201)

  const bSecond = await api('/api/responses', submission(
    bInitial.payload.question.id,
    'repeat-person',
    ['活动可以有这么多'],
  ))
  assert.equal(bSecond.response.status, 201)
  assert.equal(bSecond.payload.state.responses.length, 2)
  assert.deepEqual(
    bSecond.payload.state.ownResponse.answers.map(({ text }) => text),
    ['活动可以有这么多'],
  )

  console.log('✓ fixed CityU question and exact multi-choice options')
  console.log('✓ production host and participant pages')
  console.log('✓ malformed request handling without process crash')
  console.log('✓ stale-question, duplicate-session, and host-key protection')
  console.log('✓ server-side option and custom-answer validation')
  console.log('✓ atomic multi-select submission and private session IDs')
  console.log('✓ live SSE state delivery and per-answer aggregation')
  console.log('✓ six-grapheme custom answer and emoji-safe counting')
  console.log('✓ JSON persistence across restart and protected clearing')
  console.log('✓ private moderation list, hide, restore, and permanent delete')
  console.log('✓ variant B single choice, unlimited custom text, and repeat submissions')
} finally {
  await stopServer().catch(() => {})
  await fs.rm(temporaryDirectory, { recursive: true, force: true })
}
