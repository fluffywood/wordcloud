import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  OTHER_MAX_LENGTH,
  OTHER_OPTION,
  POLL_OPTIONS,
  POLL_QUESTION,
  POLL_VERSION,
  PRESET_OPTIONS,
} from './src/config/pollConfig.js'
import {
  cleanAnswerText,
  countGraphemes,
  hasUnsafeInvisibleCharacters,
  normalizeAnswer,
} from './src/lib/text.js'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

async function loadEnvironmentFile() {
  try {
    const contents = await fs.readFile(path.join(projectRoot, '.env'), 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match || match[1] in process.env) continue
      let value = match[2]
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not read .env; using process environment only.')
  }
}

await loadEnvironmentFile()

const isProduction = process.env.NODE_ENV === 'production'
const requestedPort = Number.parseInt(process.env.PORT || '5173', 10)
if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}
const port = requestedPort
const host = process.env.HOST || '0.0.0.0'
const dataFile = path.resolve(
  process.env.WORDCLOUD_DATA_FILE || path.join(projectRoot, 'data', 'wordcloud.json'),
)

function validatePublicUrl(value) {
  if (!value) return ''
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('PUBLIC_URL must start with http:// or https://')
  }
  return url.origin
}

const publicUrl = validatePublicUrl(process.env.PUBLIC_URL || '')

async function getAdminKey() {
  if (process.env.ADMIN_KEY?.trim()) return { key: process.env.ADMIN_KEY.trim(), generated: false }

  const keyFile = path.join(path.dirname(dataFile), '.admin-key')
  try {
    const existing = (await fs.readFile(keyFile, 'utf8')).trim()
    if (existing) return { key: existing, generated: true }
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Could not read the saved host key; generating a new one.')
  }

  const key = randomBytes(24).toString('base64url')
  await fs.mkdir(path.dirname(keyFile), { recursive: true })
  await fs.writeFile(keyFile, `${key}\n`, { encoding: 'utf8', mode: 0o600 })
  return { key, generated: true }
}

const adminCredentials = await getAdminKey()
const adminKey = adminCredentials.key

const MAX_BODY_BYTES = 16 * 1024
const configuredMaxResponses = Number.parseInt(process.env.MAX_RESPONSES || '2000', 10)
const configuredMaxSseClients = Number.parseInt(process.env.MAX_SSE_CLIENTS || '500', 10)
const MAX_RESPONSES = Number.isInteger(configuredMaxResponses) && configuredMaxResponses > 0
  ? configuredMaxResponses
  : 2000
const MAX_SSE_CLIENTS = Number.isInteger(configuredMaxSseClients) && configuredMaxSseClients > 0
  ? configuredMaxSseClients
  : 500
const sseClients = new Set()
const validOptionSet = new Set(POLL_OPTIONS)
const normalizedPresetSet = new Set(PRESET_OPTIONS.map((option) => normalizeAnswer(option)))

function createInitialState() {
  const now = new Date().toISOString()
  return {
    version: POLL_VERSION,
    question: {
      id: randomUUID(),
      text: POLL_QUESTION,
      updatedAt: now,
    },
    responses: [],
  }
}

async function loadState() {
  try {
    const parsed = JSON.parse(await fs.readFile(dataFile, 'utf8'))
    if (
      typeof parsed?.question?.id !== 'string'
      || typeof parsed?.question?.text !== 'string'
      || !parsed.question.text.trim()
      || !Array.isArray(parsed.responses)
    ) {
      throw new Error('Invalid data shape')
    }

    const responses = parsed.responses
      .filter((response) => (
        typeof response?.id === 'string'
        && typeof response?.sessionId === 'string'
      ))
      .slice(-MAX_RESPONSES)
      .map((response) => {
        const rawAnswers = Array.isArray(response.answers)
          ? response.answers
          : typeof response.text === 'string'
            ? [{ text: response.text, normalizedText: response.normalizedText }]
            : []
        const seen = new Set()
        const answers = rawAnswers.flatMap((answer) => {
          const rawText = typeof answer === 'string' ? answer : answer?.text
          if (typeof rawText !== 'string') return []
          const text = cleanAnswerText(rawText)
          const normalizedText = normalizeAnswer(text)
          if (!text || seen.has(normalizedText)) return []
          seen.add(normalizedText)
          return [{ text, normalizedText }]
        })

        return {
          id: response.id,
          answers,
          sessionId: response.sessionId,
          createdAt: response.createdAt || new Date().toISOString(),
        }
      })
      .filter((response) => response.answers.length > 0)

    const questionChanged = parsed.question.text.trim() !== POLL_QUESTION

    return {
      version: POLL_VERSION,
      question: {
        id: questionChanged ? randomUUID() : parsed.question.id,
        text: POLL_QUESTION,
        updatedAt: questionChanged ? new Date().toISOString() : parsed.question.updatedAt || new Date().toISOString(),
      },
      responses,
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Could not read ${dataFile}; starting with a clean poll.`)
    }
    return createInitialState()
  }
}

let state = await loadState()
let pendingMutation = Promise.resolve()

async function persistState(nextState) {
  const snapshot = JSON.stringify(nextState, null, 2)
  await fs.mkdir(path.dirname(dataFile), { recursive: true })
  const temporaryFile = `${dataFile}.tmp`
  await fs.writeFile(temporaryFile, snapshot, 'utf8')
  await fs.rename(temporaryFile, dataFile)
}

await persistState(state)

function commitState(updater) {
  const operation = pendingMutation.then(async () => {
    const nextState = updater(state)
    await persistState(nextState)
    state = nextState
    broadcastState()
    return state
  })
  pendingMutation = operation.catch(() => {})
  return operation
}

function getLanAddress() {
  const addresses = []
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address)
    }
  }

  return addresses.sort((a, b) => {
    const priority = (address) => {
      if (address.startsWith('192.168.')) return 0
      if (address.startsWith('10.')) return 1
      if (address.startsWith('172.')) return 2
      return 3
    }
    return priority(a) - priority(b)
  })[0]
}

function getJoinUrl(request) {
  if (publicUrl) return `${publicUrl}/join`

  const forwardedProtocol = request.headers['x-forwarded-proto']?.split(',')[0]?.trim()
  const protocol = ['http', 'https'].includes(forwardedProtocol) ? forwardedProtocol : 'http'
  const candidateHost = (request.headers.host || '').split(',')[0].trim()
  let requestHost = `localhost:${port}`
  if (candidateHost.length <= 253 && /^[A-Za-z0-9.:[\]-]+$/.test(candidateHost)) {
    try {
      requestHost = new URL(`http://${candidateHost}`).host || requestHost
    } catch {
      // Fall back to the local address when Host is malformed.
    }
  }
  const hostname = new URL(`http://${requestHost}`).hostname

  if (['localhost', 'localhost.', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(hostname)) {
    const lanAddress = getLanAddress()
    if (lanAddress) return `http://${lanAddress}:${port}/join`
  }

  return `${protocol}://${requestHost}/join`
}

function publicState(request, sessionId = '') {
  const ownResponse = sessionId
    ? state.responses.find((response) => response.sessionId === sessionId)
    : null
  return {
    question: {
      ...state.question,
      type: 'multiple-choice',
      options: POLL_OPTIONS,
      allowOther: true,
      otherMaxLength: OTHER_MAX_LENGTH,
    },
    responses: state.responses.map((response) => ({
      id: response.id,
      answers: response.answers,
      createdAt: response.createdAt,
    })),
    ownResponse: ownResponse
      ? { id: ownResponse.id, answers: ownResponse.answers, createdAt: ownResponse.createdAt }
      : null,
    joinUrl: getJoinUrl(request),
  }
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(payload))
}

function apiError(message, statusCode, code) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

function parseSelectedAnswers(body) {
  if (!Array.isArray(body.selectedOptions)) {
    throw apiError('答案选项格式不正确', 400, 'INVALID_OPTIONS')
  }
  if (body.selectedOptions.length < 1 || body.selectedOptions.length > POLL_OPTIONS.length) {
    throw apiError('请至少选择一个选项', 400, 'INVALID_OPTIONS')
  }
  if (body.selectedOptions.some((option) => typeof option !== 'string')) {
    throw apiError('答案选项格式不正确', 400, 'INVALID_OPTIONS')
  }

  const selectedOptions = body.selectedOptions.map((option) => cleanAnswerText(option))
  if (new Set(selectedOptions).size !== selectedOptions.length) {
    throw apiError('请不要重复选择同一个选项', 400, 'DUPLICATE_OPTION')
  }
  if (selectedOptions.some((option) => !validOptionSet.has(option))) {
    throw apiError('包含无效选项，请刷新页面后重试', 400, 'UNKNOWN_OPTION')
  }

  if (body.otherText !== undefined && typeof body.otherText !== 'string') {
    throw apiError('“其他”答案格式不正确', 400, 'INVALID_OTHER')
  }

  const hasOther = selectedOptions.includes(OTHER_OPTION)
  const rawOtherText = typeof body.otherText === 'string' ? body.otherText : ''
  const otherText = cleanAnswerText(rawOtherText)
  if (!hasOther && otherText) {
    throw apiError('请先选择“其他”再填写自定义答案', 400, 'UNSELECTED_OTHER')
  }
  if (hasOther) {
    const otherLength = countGraphemes(otherText)
    if (
      otherLength < 1
      || otherLength > OTHER_MAX_LENGTH
      || hasUnsafeInvisibleCharacters(rawOtherText)
    ) {
      throw apiError(`“其他”请输入 1–${OTHER_MAX_LENGTH} 个字`, 400, 'INVALID_OTHER')
    }
    if (otherText === OTHER_OPTION || normalizedPresetSet.has(normalizeAnswer(otherText))) {
      throw apiError('该词已有现成选项，请直接选择', 400, 'DUPLICATE_OTHER')
    }
  }

  const texts = selectedOptions.filter((option) => option !== OTHER_OPTION)
  if (hasOther) texts.push(otherText)
  return texts.map((text) => ({ text, normalizedText: normalizeAnswer(text) }))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      const error = new Error('Request body too large')
      error.statusCode = 413
      throw error
    }
  }

  try {
    const parsed = body ? JSON.parse(body) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Request body must be a JSON object')
    }
    return parsed
  } catch {
    const error = new Error('Invalid JSON')
    error.statusCode = 400
    throw error
  }
}

function isAdmin(request) {
  return request.headers['x-admin-key'] === adminKey
}

function sendSse(client) {
  client.response.write(`event: state\ndata: ${JSON.stringify(publicState(client.request, client.sessionId))}\n\n`)
}

function broadcastState() {
  for (const client of sseClients) {
    try {
      sendSse(client)
    } catch {
      sseClients.delete(client)
    }
  }
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    json(response, 200, { ok: true, responses: state.responses.length })
    return true
  }

  if (request.method === 'GET' && url.pathname === '/api/state') {
    json(response, 200, publicState(request, url.searchParams.get('sessionId') || ''))
    return true
  }

  if (request.method === 'GET' && url.pathname === '/api/events') {
    if (sseClients.size >= MAX_SSE_CLIENTS) {
      json(response, 503, { error: '当前在线人数过多，请稍后重试' })
      return true
    }
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    response.write(': connected\n\n')
    const client = { request, response, sessionId: url.searchParams.get('sessionId') || '' }
    sseClients.add(client)
    sendSse(client)
    request.on('close', () => sseClients.delete(client))
    response.on('error', () => sseClients.delete(client))
    return true
  }

  if (request.method === 'POST' && url.pathname === '/api/responses') {
    const body = await readJson(request)
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const questionId = typeof body.questionId === 'string' ? body.questionId.trim() : ''

    if (!sessionId || sessionId.length > 128) {
      json(response, 400, { error: '参与者标识无效' })
      return true
    }
    let answers
    try {
      answers = parseSelectedAnswers(body)
    } catch (error) {
      json(response, error.statusCode || 400, { error: error.message, code: error.code })
      return true
    }
    let item
    try {
      await commitState((currentState) => {
        if (!questionId || questionId !== currentState.question.id) {
          throw apiError('问题刚刚更新了，请重新查看后再回答', 409, 'QUESTION_CHANGED')
        }
        if (currentState.responses.some((responseItem) => responseItem.sessionId === sessionId)) {
          throw apiError('你已经回答过这道题了', 409, 'ALREADY_SUBMITTED')
        }
        if (currentState.responses.length >= MAX_RESPONSES) {
          throw apiError('本轮回答数量已达上限，请联系主持人开始新一轮', 409, 'POLL_FULL')
        }

        item = {
          id: randomUUID(),
          answers,
          sessionId,
          createdAt: new Date().toISOString(),
        }
        return { ...currentState, responses: [...currentState.responses, item] }
      })
    } catch (error) {
      if (error.statusCode) {
        json(response, error.statusCode, {
          error: error.message,
          code: error.code,
          state: publicState(request, sessionId),
        })
        return true
      }
      throw error
    }
    json(response, 201, { ok: true, response: item, state: publicState(request, sessionId) })
    return true
  }

  if (request.method === 'DELETE' && url.pathname === '/api/responses') {
    if (!isAdmin(request)) {
      json(response, 401, { error: '主持人密钥不正确' })
      return true
    }
    await commitState((currentState) => ({ ...currentState, responses: [] }))
    json(response, 200, publicState(request, url.searchParams.get('sessionId') || ''))
    return true
  }

  return url.pathname.startsWith('/api/')
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

async function serveProductionFile(request, response, url) {
  const distRoot = path.join(projectRoot, 'dist')
  const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1))
  const requestedPath = path.resolve(distRoot, relativePath)
  const safePath = requestedPath.startsWith(`${distRoot}${path.sep}`) ? requestedPath : path.join(distRoot, 'index.html')

  try {
    const stats = await fs.stat(safePath)
    const filePath = stats.isFile() ? safePath : path.join(distRoot, 'index.html')
    const contents = await fs.readFile(filePath)
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(contents)
  } catch {
    try {
      const contents = await fs.readFile(path.join(distRoot, 'index.html'))
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      response.end(contents)
    } catch {
      json(response, 503, { error: '尚未构建前端，请先运行 npm run build' })
    }
  }
}

let vite
const server = createServer(async (request, response) => {
  let url
  try {
    url = new URL(request.url || '/', 'http://localhost')
  } catch {
    json(response, 400, { error: '请求地址无效' })
    return
  }

  try {
    if (await handleApi(request, response, url)) {
      if (!response.headersSent) json(response, 404, { error: '接口不存在' })
      return
    }

    if (isProduction) {
      await serveProductionFile(request, response, url)
    } else {
      vite.middlewares(request, response, (error) => {
        if (error) {
          console.error(error)
          if (!response.headersSent) json(response, 500, { error: '开发服务器错误' })
        }
      })
    }
  } catch (error) {
    console.error(error)
    if (!response.headersSent) {
      const statusCode = error.statusCode || 500
      json(response, statusCode, {
        error: statusCode >= 500 ? '服务器内部错误，请稍后重试' : error.message,
      })
    } else {
      response.end()
    }
  }
})

const heartbeatTimer = setInterval(() => {
  for (const client of sseClients) {
    try {
      client.response.write(': heartbeat\n\n')
    } catch {
      sseClients.delete(client)
    }
  }
}, 20_000)
heartbeatTimer.unref()

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n端口 ${port} 已被占用。请关闭旧服务，或使用 PORT=其他端口 npm run dev。\n`)
  } else {
    console.error(error)
  }
  process.exit(1)
})

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite')
  vite = await createViteServer({
    root: projectRoot,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: 'spa',
  })
}

server.listen(port, host, () => {
  const lanAddress = getLanAddress()
  const hostOrigin = publicUrl || `http://localhost:${port}`
  const participantUrl = publicUrl
    ? `${publicUrl}/join`
    : lanAddress
      ? `http://${lanAddress}:${port}/join`
      : `http://localhost:${port}/join`
  console.log(`\n  WordFlow 已启动`)
  console.log(`  主持人大屏: ${hostOrigin}/?admin=${encodeURIComponent(adminKey)}`)
  console.log(`  手机参与页: ${participantUrl}`)
  if (adminCredentials.generated) console.log(`  主持人密钥已自动生成并保存在 ${path.join(path.dirname(dataFile), '.admin-key')}`)
  console.log(`  数据文件: ${dataFile}\n`)
})

function shutdown() {
  clearInterval(heartbeatTimer)
  for (const client of sseClients) client.response.end()
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
