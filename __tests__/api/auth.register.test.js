/**
 * @jest-environment node
 */
import { POST } from '@/app/api/auth/register/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({ query: jest.fn() }))
jest.mock('bcryptjs', () => ({ hash: jest.fn() }))
jest.mock('@/lib/rateLimit', () => ({ checkRateLimit: jest.fn() }))

import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/rateLimit'

const makeRequest = (body) =>
  new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

beforeEach(() => {
  jest.clearAllMocks()
  checkRateLimit.mockReturnValue({ allowed: true, retryAfter: 0 })
})

describe('POST /api/auth/register', () => {
  it('returns 201 with success message', async () => {
    bcrypt.hash.mockResolvedValue('hashed-password')
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await POST(
      makeRequest({ email: 'a@b.com', password: 'pass', name: 'Alice' }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('User created successfully')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', password: 'pass' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already exists', async () => {
    bcrypt.hash.mockResolvedValue('hashed-password')
    const dupError = new Error('Duplicate')
    dupError.code = 'ER_DUP_ENTRY'
    query.mockRejectedValue(dupError)

    const res = await POST(
      makeRequest({ email: 'existing@b.com', password: 'pass', name: 'Bob' }),
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Email already exists')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    checkRateLimit.mockReturnValue({ allowed: false, retryAfter: 900 })

    const res = await POST(
      makeRequest({ email: 'a@b.com', password: 'pass', name: 'Alice' }),
    )

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('900')
    const body = await res.json()
    expect(body.error).toMatch(/too many/i)
  })
})
