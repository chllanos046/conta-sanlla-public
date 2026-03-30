/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/accounts/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryConn: jest.fn(),
  withTransaction: jest.fn(),
}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query, queryConn, withTransaction } from '@/lib/db'
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
  it('returns 200 with accounts array', async () => {
    const mockAccounts = [
      { id: 1, name: 'Savings', currency: 'USD', type: 'bank', balance: 1000 },
    ]
    query.mockResolvedValue(mockAccounts)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 1, name: 'Savings' })
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/accounts', () => {
  it('returns 201 when account is created without balance', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await POST(
      makeRequest('POST', { name: 'Savings', currency: 'USD', type: 'bank' }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('Account created')
  })

  it('returns 201 and uses query directly when createTransaction is false', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await POST(
      makeRequest('POST', { name: 'Savings', currency: 'USD', type: 'bank', balance: 50, createTransaction: false }),
    )

    expect(res.status).toBe(201)
    expect(query).toHaveBeenCalled()
    expect(withTransaction).not.toHaveBeenCalled()
  })

  it('returns 201 and uses withTransaction when createTransaction is true', async () => {
    withTransaction.mockImplementation(async (cb) => {
      queryConn.mockResolvedValue({ insertId: 99, affectedRows: 1 })
      return cb({})
    })

    const res = await POST(
      makeRequest('POST', { name: 'Savings', currency: 'USD', type: 'bank', balance: 100, createTransaction: true }),
    )

    expect(res.status).toBe(201)
    expect(withTransaction).toHaveBeenCalled()
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
