/**
 * @jest-environment node
 */
import { POST } from '@/app/api/transactions/route'
import { PUT } from '@/app/api/transactions/[id]/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({ query: vi.fn(), getDefaultCategoryId: vi.fn() }))
vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { query, getDefaultCategoryId } from '@/lib/db'
import { auth } from '@/auth'

const makePostReq = (body) =>
  new NextRequest('http://localhost/api/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

const makePutReq = (id, body) =>
  new NextRequest(`http://localhost/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
  getDefaultCategoryId.mockResolvedValue(null)
})

describe('Credit card account restrictions — POST', () => {
  it('returns 400 when income targets a credit card account', async () => {
    query.mockResolvedValueOnce([{ type: 'credit' }]) // account type check

    const res = await POST(makePostReq({
      type: 'income',
      amount: 500,
      target_account_id: 10,
      date: '2024-01-15',
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/credit card/i)
  })

  it('returns 400 when transfer uses a credit card as source', async () => {
    query
      .mockResolvedValueOnce([{ type: 'credit', currency: 'USD' }]) // source account
      .mockResolvedValueOnce([{ currency: 'USD' }])                  // target account

    const res = await POST(makePostReq({
      type: 'transfer',
      amount: 200,
      source_account_id: 10,
      target_account_id: 2,
      date: '2024-01-15',
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/credit card/i)
  })

  it('returns 201 when expense uses a credit card as source (valid charge)', async () => {
    query.mockResolvedValue({ count: 1 }) // INSERT

    const res = await POST(makePostReq({
      type: 'expense',
      amount: -100,
      source_account_id: 10,
      date: '2024-01-15',
    }))

    expect(res.status).toBe(201)
  })

  it('returns 201 when transfer targets a credit card (valid payment)', async () => {
    query
      .mockResolvedValueOnce([{ type: 'bank', currency: 'USD' }]) // source account — not credit
      .mockResolvedValueOnce([{ currency: 'USD' }])                // target account (credit card)
      .mockResolvedValueOnce({ count: 1 })                         // INSERT

    const res = await POST(makePostReq({
      type: 'transfer',
      amount: 200,
      source_account_id: 2,
      target_account_id: 10,
      date: '2024-01-15',
    }))

    expect(res.status).toBe(201)
  })

  it('returns 201 when income targets a regular (non-credit) account', async () => {
    query
      .mockResolvedValueOnce([{ type: 'bank' }]) // account type check
      .mockResolvedValueOnce({ count: 1 })        // INSERT

    const res = await POST(makePostReq({
      type: 'income',
      amount: 500,
      target_account_id: 5,
      date: '2024-01-15',
    }))

    expect(res.status).toBe(201)
  })
})

describe('Credit card account restrictions — PUT', () => {
  it('returns 400 when editing a transaction to target a credit card with income', async () => {
    query.mockResolvedValueOnce([{ type: 'credit' }]) // account type check

    const res = await PUT(
      makePutReq(99, {
        type: 'income',
        amount: 300,
        target_account_id: 10,
        date: '2024-01-20',
      }),
      { params: Promise.resolve({ id: '99' }) },
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/credit card/i)
  })

  it('returns 400 when editing a transfer to use a credit card as source', async () => {
    query
      .mockResolvedValueOnce([{ type: 'credit', currency: 'USD' }])
      .mockResolvedValueOnce([{ currency: 'USD' }])

    const res = await PUT(
      makePutReq(99, {
        type: 'transfer',
        amount: 150,
        source_account_id: 10,
        target_account_id: 3,
        date: '2024-01-20',
      }),
      { params: Promise.resolve({ id: '99' }) },
    )

    expect(res.status).toBe(400)
  })
})
