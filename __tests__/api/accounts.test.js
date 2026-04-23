/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/accounts/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method = 'GET', body = null) =>
  new NextRequest('http://localhost/api/accounts', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/accounts', () => {
  it('returns 200 with accounts including initial_balance and current_balance', async () => {
    const mockAccounts = [
      { id: 1, name: 'Savings', currency: 'USD', type: 'bank', initial_balance: 1000, current_balance: 1500 },
    ]
    query.mockResolvedValue(mockAccounts)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 1, name: 'Savings', initial_balance: 1000, current_balance: 1500 })
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/accounts', () => {
  it('returns 201 when account is created without initial_balance', async () => {
    query.mockResolvedValue([{ id: 1 }])

    const res = await POST(
      makeRequest('POST', { name: 'Savings', currency: 'USD', type: 'bank' }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('Account created')
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 201 when account is created with initial_balance', async () => {
    query.mockResolvedValue([{ id: 2 }])

    const res = await POST(
      makeRequest('POST', { name: 'Savings', currency: 'USD', type: 'bank', initial_balance: 500 }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('Account created')
    // No withTransaction — just a single INSERT
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest('POST', { name: 'Savings' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await POST(
      makeRequest('POST', { name: 'Savings', currency: 'USD', type: 'bank' }),
    )
    expect(res.status).toBe(401)
  })
})
