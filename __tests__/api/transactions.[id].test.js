/**
 * @jest-environment node
 */
import { PUT, DELETE } from '@/app/api/transactions/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method, body = null) =>
  new NextRequest('http://localhost/api/transactions/1', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

const params = { id: '1' }

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('PUT /api/transactions/[id]', () => {
  it('returns 200 when expense transaction is updated with negative amount', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await PUT(
      makeRequest('PUT', {
        type: 'expense',
        amount: -100,
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
    // No balance updates — just one UPDATE query
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 200 when income transaction is updated with positive amount', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await PUT(
      makeRequest('PUT', {
        type: 'income',
        amount: 500,
        source_account_id: null,
        target_account_id: 1,
        date: '2024-01-15',
      }),
      { params },
    )

    expect(res.status).toBe(200)
  })

  it('returns 400 when expense has positive amount (sign violation)', async () => {
    const res = await PUT(
      makeRequest('PUT', {
        type: 'expense',
        amount: 100,
        source_account_id: 1,
        date: '2024-01-15',
      }),
      { params },
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 when income has negative amount (sign violation)', async () => {
    const res = await PUT(
      makeRequest('PUT', {
        type: 'income',
        amount: -100,
        target_account_id: 1,
        date: '2024-01-15',
      }),
      { params },
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 when transfer has negative amount (sign violation)', async () => {
    const res = await PUT(
      makeRequest('PUT', {
        type: 'transfer',
        amount: -200,
        source_account_id: 1,
        target_account_id: 2,
        date: '2024-01-15',
      }),
      { params },
    )

    expect(res.status).toBe(400)
  })

  it('returns 404 when transaction does not exist', async () => {
    query.mockResolvedValue({ affectedRows: 0 })

    const res = await PUT(
      makeRequest('PUT', {
        type: 'expense',
        amount: -100,
        date: '2024-01-15',
      }),
      { params },
    )

    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await PUT(makeRequest('PUT', { type: 'expense', amount: -50 }), { params })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/transactions/[id]', () => {
  it('returns 200 when transaction is deleted without touching account balances', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await DELETE(makeRequest('DELETE'), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Transaction deleted')
    // Just one DELETE query — no balance reversal
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when transaction does not exist', async () => {
    query.mockResolvedValue({ affectedRows: 0 })

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })
})
