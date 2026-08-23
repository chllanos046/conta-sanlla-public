/**
 * @jest-environment node
 */
import { PUT, DELETE } from '@/app/api/accounts/[id]/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method, body = null) =>
  new NextRequest('http://localhost/api/accounts/1', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

const params = { id: '1' }

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('PUT /api/accounts/[id]', () => {
  it('returns 200 when account is updated with initial_balance', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank', initial_balance: 500 }),
      { params },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Account updated')
    // Single UPDATE — no transaction needed
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 200 when account is updated without initial_balance (defaults to 0)', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank' }),
      { params },
    )

    expect(res.status).toBe(200)
  })

  it('returns 404 when account does not exist', async () => {
    query.mockResolvedValue(Object.assign([], { count: 0 }))

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank', initial_balance: 0 }),
      { params },
    )

    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await PUT(
      makeRequest('PUT', { name: 'X', currency: 'USD', type: 'bank' }),
      { params },
    )
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/accounts/[id]', () => {
  it('returns 200 when account is deleted', async () => {
    query.mockResolvedValueOnce(Object.assign([], { count: 1 }))

    const res = await DELETE(makeRequest('DELETE'), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Account deleted')
  })

  it('returns 404 when account does not exist', async () => {
    query.mockResolvedValueOnce(Object.assign([], { count: 0 }))

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })
})
