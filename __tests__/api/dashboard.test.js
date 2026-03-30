/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({ query: jest.fn() }))
jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/utils', () => ({
  calculateRunningBalance: jest.fn((txs) => txs),
}))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (search = '') =>
  new NextRequest(`http://localhost/api/dashboard${search}`)

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/dashboard', () => {
  it('returns 200 with accounts, transactions, categories, and summary', async () => {
    const mockAccounts = [{ id: 1, name: 'Bank', currency: 'USD', type: 'bank', balance: 1000 }]
    const mockTransactions = [{ id: 1, type: 'expense', amount: 50 }]
    const mockCategories = [{ id: 1, name: 'Food', type: 'expense' }]

    query
      .mockResolvedValueOnce(mockAccounts)
      .mockResolvedValueOnce(mockTransactions)
      .mockResolvedValueOnce(mockCategories)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accounts')
    expect(body).toHaveProperty('transactions')
    expect(body).toHaveProperty('categories')
    expect(body).toHaveProperty('summary')
    expect(body.summary).toHaveProperty('totalBalance')
    expect(body.summary).toHaveProperty('transactionCount')
    expect(body.summary.totalBalance).toBe(1000)
    expect(body.summary.transactionCount).toBe(1)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('accepts period query parameter', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const res = await GET(makeRequest('?period=week'))

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalledTimes(3)
  })
})
