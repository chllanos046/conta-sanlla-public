/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/transactions/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method = 'GET', body = null, search = '') =>
  new NextRequest(`http://localhost/api/transactions${search}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/transactions', () => {
  it('returns 200 with transactions, accounts, categories, and opening_balance', async () => {
    query
      .mockResolvedValueOnce([{ id: 1, type: 'expense', amount: -50 }]) // transactions
      .mockResolvedValueOnce([{ id: 1, name: 'Bank', initial_balance: 1000 }]) // accounts
      .mockResolvedValueOnce([{ id: 1, name: 'Food', type: 'expense' }]) // categories

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('transactions')
    expect(body).toHaveProperty('accounts')
    expect(body).toHaveProperty('categories')
    expect(body).toHaveProperty('opening_balance')
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
  it('returns 201 when expense transaction is created with negative amount', async () => {
    query.mockResolvedValue({ insertId: 1 })

    const res = await POST(
      makeRequest('POST', {
        type: 'expense',
        amount: -50,
        source_account_id: 1,
        date: '2024-01-15',
        description: 'Lunch',
      }),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('Transaction created')
    // Just one INSERT — no balance UPDATE
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('returns 201 when income transaction is created with positive amount', async () => {
    query.mockResolvedValue({ insertId: 2 })

    const res = await POST(
      makeRequest('POST', {
        type: 'income',
        amount: 500,
        target_account_id: 1,
        date: '2024-01-15',
      }),
    )

    expect(res.status).toBe(201)
  })

  it('returns 201 when transfer is created with positive amount', async () => {
    query.mockResolvedValue({ insertId: 3 })

    const res = await POST(
      makeRequest('POST', {
        type: 'transfer',
        amount: 200,
        source_account_id: 1,
        target_account_id: 2,
        date: '2024-01-15',
      }),
    )

    expect(res.status).toBe(201)
  })

  it('returns 400 when expense amount is positive (sign violation)', async () => {
    const res = await POST(
      makeRequest('POST', { type: 'expense', amount: 50, source_account_id: 1, date: '2024-01-15' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when income amount is negative (sign violation)', async () => {
    const res = await POST(
      makeRequest('POST', { type: 'income', amount: -50, target_account_id: 1, date: '2024-01-15' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when transfer amount is negative (sign violation)', async () => {
    const res = await POST(
      makeRequest('POST', { type: 'transfer', amount: -200, source_account_id: 1, target_account_id: 2, date: '2024-01-15' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest('POST', { amount: -50 }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await POST(
      makeRequest('POST', { type: 'expense', amount: -50, date: '2024-01-15' }),
    )
    expect(res.status).toBe(401)
  })

  it('stores the signed amount as-is in the DB (expense stays negative)', async () => {
    query.mockResolvedValue({ insertId: 10 })

    await POST(
      makeRequest('POST', {
        type: 'expense',
        amount: -75,
        source_account_id: 3,
        date: '2024-01-15',
        description: 'Groceries',
      }),
    )

    expect(query).toHaveBeenCalledTimes(1)
    const queryParams = query.mock.calls[0][1]
    // params order: [type, amount, source_account_id, target_account_id, category_id, date, description]
    const [type, amount, source, target] = queryParams
    expect(type).toBe('expense')
    expect(amount).toBe(-75) // amount stored as negative
    expect(source).toBe(3)   // source_account_id
    expect(target).toBeNull() // target_account_id
  })

  it('stores income amount as positive in the DB', async () => {
    query.mockResolvedValue({ insertId: 11 })

    await POST(
      makeRequest('POST', {
        type: 'income',
        amount: 1200,
        target_account_id: 2,
        category_id: 5,
        date: '2024-02-01',
        description: 'Salary',
      }),
    )

    const [type, amount, source, target] = query.mock.calls[0][1]
    expect(type).toBe('income')
    expect(amount).toBe(1200)    // positive
    expect(source).toBeNull()    // source_account_id
    expect(target).toBe(2)       // target_account_id
  })

  it('stores transfer with both source and target account IDs', async () => {
    query.mockResolvedValue({ insertId: 12 })

    await POST(
      makeRequest('POST', {
        type: 'transfer',
        amount: 500,
        source_account_id: 1,
        target_account_id: 4,
        date: '2024-03-10',
      }),
    )

    const [type, amount, source, target] = query.mock.calls.at(-1)[1]
    expect(type).toBe('transfer')
    expect(amount).toBe(500)
    expect(source).toBe(1) // source_account_id
    expect(target).toBe(4) // target_account_id
  })

  it('returns 400 when type field is missing', async () => {
    const res = await POST(
      makeRequest('POST', { amount: -50, date: '2024-01-15' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when date field is missing', async () => {
    const res = await POST(
      makeRequest('POST', { type: 'expense', amount: -50 }),
    )
    expect(res.status).toBe(400)
  })
})
