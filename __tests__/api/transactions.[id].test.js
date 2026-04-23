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
    query.mockResolvedValue(Object.assign([], { count: 1 }))

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
    query.mockResolvedValue(Object.assign([], { count: 1 }))

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
    query.mockResolvedValue(Object.assign([], { count: 0 }))

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

  it('returns 200 for transfer update with source and target account IDs', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await PUT(
      makeRequest('PUT', {
        type: 'transfer',
        amount: 200,
        source_account_id: 3,
        target_account_id: 4,
        category_id: null,
        date: '2024-03-10',
        description: 'Transfer to savings',
      }),
      { params },
    )

    expect(res.status).toBe(200)
    const queryParams = query.mock.calls[0][1]
    expect(queryParams[0]).toBe('transfer')
    expect(queryParams[1]).toBe(200)
    expect(queryParams[2]).toBe(3) // source_account_id
    expect(queryParams[3]).toBe(4) // target_account_id
  })

  it('returns 200 for expense update changing source account', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await PUT(
      makeRequest('PUT', {
        type: 'expense',
        amount: -150,
        source_account_id: 2,
        target_account_id: null,
        category_id: null,
        date: '2024-04-01',
        description: 'Rent',
      }),
      { params },
    )

    expect(res.status).toBe(200)
    const queryParams = query.mock.calls[0][1]
    expect(queryParams[0]).toBe('expense')
    expect(queryParams[1]).toBe(-150) // negative stored
    expect(queryParams[2]).toBe(2)    // source_account_id
    expect(queryParams[3]).toBeNull() // target_account_id
  })

  it('stores correct positive amount for income update', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    await PUT(
      makeRequest('PUT', {
        type: 'income',
        amount: 300,
        source_account_id: null,
        target_account_id: 1,
        category_id: null,
        date: '2024-05-01',
        description: '',
      }),
      { params },
    )

    const queryParams = query.mock.calls[0][1]
    expect(queryParams[0]).toBe('income')
    expect(queryParams[1]).toBe(300)    // positive
    expect(queryParams[2]).toBeNull()   // source_account_id
    expect(queryParams[3]).toBe(1)      // target_account_id
  })
})

describe('DELETE /api/transactions/[id]', () => {
  it('returns 200 when transaction is deleted without touching account balances', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await DELETE(makeRequest('DELETE'), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Transaction deleted')
    // Just one DELETE query — no balance reversal
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when transaction does not exist', async () => {
    query.mockResolvedValue(Object.assign([], { count: 0 }))

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })
})
