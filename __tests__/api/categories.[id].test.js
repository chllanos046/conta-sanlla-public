/**
 * @jest-environment node
 */
import { PUT, DELETE } from '@/app/api/categories/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({ query: jest.fn() }))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method, body = null) =>
  new NextRequest('http://localhost/api/categories/1', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

const params = { id: '1' }

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('PUT /api/categories/[id]', () => {
  it('returns 200 when category is updated', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', type: 'expense' }),
      { params },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Category updated')
  })

  it('returns 404 when category does not exist', async () => {
    query.mockResolvedValue(Object.assign([], { count: 0 }))

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', type: 'expense' }),
      { params },
    )

    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await PUT(
      makeRequest('PUT', { name: 'X', type: 'expense' }),
      { params },
    )
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/categories/[id]', () => {
  it('returns 200 when category is deleted', async () => {
    query.mockResolvedValue(Object.assign([], { count: 1 }))

    const res = await DELETE(makeRequest('DELETE'), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Category deleted')
  })

  it('returns 404 when category does not exist', async () => {
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
