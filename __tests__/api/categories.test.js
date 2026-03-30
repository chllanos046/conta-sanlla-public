/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/categories/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({ query: jest.fn() }))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method = 'GET', body = null) =>
  new NextRequest('http://localhost/api/categories', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('GET /api/categories', () => {
  it('returns 200 with categories array', async () => {
    const mockCategories = [
      { id: 1, name: 'Food', type: 'expense' },
      { id: 2, name: 'Salary', type: 'income' },
    ]
    query.mockResolvedValue(mockCategories)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({ id: 1, name: 'Food', type: 'expense' })
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/categories', () => {
  it('returns 201 when category is created', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await POST(makeRequest('POST', { name: 'Food', type: 'expense' }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.message).toBe('Category created')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest('POST', { name: 'Food' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await POST(makeRequest('POST', { name: 'Food', type: 'expense' }))
    expect(res.status).toBe(401)
  })
})
