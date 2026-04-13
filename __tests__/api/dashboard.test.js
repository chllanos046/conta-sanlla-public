/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({ query: jest.fn() }))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (search = '') =>
  new NextRequest(`http://localhost/api/dashboard${search}`)

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/dashboard', () => {
  it('returns 200 with accounts (including current_balance), transactions, categories, and summary', async () => {
    const mockAccounts = [
      { id: 1, name: 'Bank', currency: 'USD', type: 'bank', initial_balance: 1000, current_balance: 1500 },
    ]
    const mockTransactions = [{ id: 1, type: 'income', amount: 500 }]
    const mockCategories = [{ id: 1, name: 'Salary', type: 'income' }]

    query
      .mockResolvedValueOnce(mockAccounts)                         // accounts with current_balance
      .mockResolvedValueOnce(mockTransactions)                     // period transactions
      .mockResolvedValueOnce(mockCategories)                       // categories
      .mockResolvedValueOnce([{ income: 400, expense: 100 }])     // prevMonthSummary

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accounts')
    expect(body).toHaveProperty('transactions')
    expect(body).toHaveProperty('categories')
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('prevMonthSummary')
    expect(body.summary).toHaveProperty('totalBalance')
    expect(body.summary).toHaveProperty('transactionCount')
    // totalBalance sums current_balance from accounts
    expect(body.summary.totalBalance).toBe(1500)
    expect(body.summary.transactionCount).toBe(1)
    expect(body.accounts[0]).toMatchObject({ initial_balance: 1000, current_balance: 1500 })
    expect(body.prevMonthSummary).toMatchObject({ income: 400, expense: 100 })
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
      .mockResolvedValueOnce([{ income: 0, expense: 0 }])

    const res = await GET(makeRequest('?period=year'))

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalledTimes(4)
  })

  it('returns totalBalance = 0 when no accounts', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ income: 0, expense: 0 }])

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.summary.totalBalance).toBe(0)
  })
})
