/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/transactions/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryConn: jest.fn(),
  withTransaction: jest.fn(),
}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query, queryConn, withTransaction } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method = 'GET', body = null, search = '') =>
  new NextRequest(`http://localhost/api/transactions${search}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/transactions', () => {
  it('returns 200 with transactions, accounts, and categories', async () => {
    query
      .mockResolvedValueOnce([{ id: 1, type: 'expense', amount: 50 }]) // transactions
      .mockResolvedValueOnce([{ id: 1, name: 'Bank' }])                // accounts
      .mockResolvedValueOnce([{ id: 1, name: 'Food', type: 'expense' }]) // categories

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('transactions')
    expect(body).toHaveProperty('accounts')
    expect(body).toHaveProperty('categories')
    expect(Array.isArray(body.transactions)).toBe(true)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('applies query parameter filters', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const res = await GET(makeRequest('GET', null, '?type=expense&dateFrom=2024-01-01'))

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalledTimes(3)
  })
})

describe('POST /api/transactions', () => {
  it('returns 201 when transaction is created', async () => {
    withTransaction.mockImplementation(async (cb) => {
      queryConn.mockResolvedValue({ affectedRows: 1 })
      return cb({})
    })

    const res = await POST(
      makeRequest('POST', {
        type: 'expense',
        amount: 50,
        source_account_id: 1,
        date: '2024-01-15',
        description: 'Lunch',
      }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('Transaction created')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest('POST', { amount: 50 }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await POST(
      makeRequest('POST', { type: 'expense', amount: 50, date: '2024-01-15' }),
    )
    expect(res.status).toBe(401)
  })
})
