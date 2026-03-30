/**
 * @jest-environment node
 */
import { PUT, DELETE } from '@/app/api/transactions/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryConn: jest.fn(),
  withTransaction: jest.fn(),
}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query, queryConn, withTransaction } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method, body = null) =>
  new NextRequest('http://localhost/api/transactions/1', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

const params = { id: '1' }

const mockTransaction = {
  id: 1,
  type: 'expense',
  amount: 50,
  source_account_id: 1,
  target_account_id: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('PUT /api/transactions/[id]', () => {
  it('returns 200 when transaction is updated', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await PUT(
      makeRequest('PUT', {
        type: 'expense',
        amount: 100,
        source_account_id: 1,
        target_account_id: null,
        category_id: null,
        date: '2024-01-15',
        description: 'Updated',
      }),
      { params },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Transaction updated')
  })

  it('returns 404 when transaction does not exist', async () => {
    query.mockResolvedValue({ affectedRows: 0 })

    const res = await PUT(
      makeRequest('PUT', {
        type: 'expense',
        amount: 100,
        date: '2024-01-15',
      }),
      { params },
    )

    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await PUT(makeRequest('PUT', { type: 'expense', amount: 50 }), { params })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/transactions/[id]', () => {
  it('returns 200 when transaction is deleted', async () => {
    query.mockResolvedValue([mockTransaction])
    withTransaction.mockImplementation(async (cb) => {
      queryConn.mockResolvedValue({ affectedRows: 1 })
      return cb({})
    })

    const res = await DELETE(makeRequest('DELETE'), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Transaction deleted')
  })

  it('returns 404 when transaction does not exist', async () => {
    query.mockResolvedValue([])

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })
})
