/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/auth', () => ({ auth: vi.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (search = '') =>
  new NextRequest(`http://localhost/api/dashboard${search}`)

// Query order (Promise.all): accountRows, txForBalance, transactions, countRows, chartTransactions, categories, prevMonthRows
const mockQueryDefault = ({ accounts = [], txForBalance = [], transactions = [], total = 0, chartTransactions = [], categories = [], prevMonth = { income: 0, expense: 0 } } = {}) => {
  query
    .mockResolvedValueOnce(accounts)
    .mockResolvedValueOnce(txForBalance)
    .mockResolvedValueOnce(transactions)
    .mockResolvedValueOnce([{ total }])
    .mockResolvedValueOnce(chartTransactions)
    .mockResolvedValueOnce(categories)
    .mockResolvedValueOnce([prevMonth])
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/dashboard', () => {
  it('returns 200 with accounts, transactions, chartTransactions, categories, summary, prevMonthSummary', async () => {
    const mockAccounts = [
      { id: 1, name: 'Bank', currency: 'USD', type: 'bank', initial_balance: 1000 },
    ]
    const mockTxForBalance = [{ type: 'income', amount: 500, target_account_id: 1 }]
    const mockTransactions = [{ id: 1, type: 'income', amount: 500 }]
    const mockCategories = [{ id: 1, name: 'Salary', type: 'income' }]

    mockQueryDefault({
      accounts: mockAccounts,
      txForBalance: mockTxForBalance,
      transactions: mockTransactions,
      total: 1,
      categories: mockCategories,
      prevMonth: { income: 400, expense: 100 },
    })

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('accounts')
    expect(body).toHaveProperty('transactions')
    expect(body).toHaveProperty('chartTransactions')
    expect(body).toHaveProperty('categories')
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('prevMonthSummary')
    expect(body.summary).toHaveProperty('totalBalance')
    expect(body.summary).toHaveProperty('total')
    expect(body.summary.totalBalance).toBe(1500)
    expect(body.summary.total).toBe(1)
    expect(body.accounts[0]).toMatchObject({ initial_balance: 1000, current_balance: 1500 })
    expect(body.prevMonthSummary).toMatchObject({ income: 400, expense: 100 })
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('accepts period query parameter', async () => {
    mockQueryDefault()

    const res = await GET(makeRequest('?period=year'))

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalledTimes(7)
  })

  it('returns totalBalance = 0 when no accounts', async () => {
    mockQueryDefault()

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.summary.totalBalance).toBe(0)
  })
})
