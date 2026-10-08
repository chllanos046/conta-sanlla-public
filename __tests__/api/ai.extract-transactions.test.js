/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai/extract-transactions/route'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/auth'

const ROWS = '[{"date":"2026-10-01","description":"Coffee","amount":"1.500","currency":"ARS"}]'

const makeRequest = () =>
  new NextRequest('http://localhost/api/ai/extract-transactions', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: 'abc' }),
    headers: { 'content-type': 'application/json' },
  })

const geminiOk = { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: ROWS }] } }] }) }
const chatOk = { ok: true, json: async () => ({ choices: [{ message: { content: ROWS } }] }) }
const fail = (message) => ({ ok: false, status: 429, json: async () => ({ error: { message } }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  auth.mockResolvedValue({ user: { id: 1 } })
  vi.stubEnv('GEMINI_API_KEY', 'g')
  vi.stubEnv('GROQ_API_KEY', 'q')
  vi.stubEnv('OPENROUTER_API_KEY', 'o')
  global.fetch = vi.fn()
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/ai/extract-transactions', () => {
  it('uses Gemini without calling fallbacks', async () => {
    fetch.mockResolvedValueOnce(geminiOk)

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect((await res.json()).transactions[0].amount).toBe(1500)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to OpenRouter when Gemini and Groq fail', async () => {
    fetch
      .mockResolvedValueOnce(fail('quota'))
      .mockResolvedValueOnce(fail('quota'))
      .mockResolvedValueOnce(chatOk)

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(fetch.mock.calls[2][0]).toContain('openrouter.ai')
  })

  it('returns 429 with smallest retryAfter when all providers are rate-limited', async () => {
    fetch
      .mockResolvedValueOnce(fail('Please retry in 30s'))
      .mockResolvedValueOnce(fail('Try again in 12.5s'))
      .mockResolvedValueOnce(fail('Retry in 40s'))

    const res = await POST(makeRequest())

    expect(res.status).toBe(429)
    expect((await res.json()).retryAfter).toBe(13)
  })

  it('skips fallbacks whose key is unset', async () => {
    vi.stubEnv('GROQ_API_KEY', '')
    fetch.mockResolvedValueOnce(fail('quota')).mockResolvedValueOnce(chatOk)

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][0]).toContain('openrouter.ai')
  })

  it('returns 502 when Gemini fails and no fallback is configured', async () => {
    vi.stubEnv('GROQ_API_KEY', '')
    vi.stubEnv('OPENROUTER_API_KEY', '')
    fetch.mockResolvedValueOnce(fail('Retry in 5s'))

    const res = await POST(makeRequest())

    expect(res.status).toBe(502)
  })
})
