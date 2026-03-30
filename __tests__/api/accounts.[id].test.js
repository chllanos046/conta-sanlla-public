/**
 * @jest-environment node
 */
import { PUT, DELETE } from '@/app/api/accounts/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryConn: jest.fn(),
  withTransaction: jest.fn(),
}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('fs/promises', () => ({ unlink: jest.fn().mockResolvedValue(undefined) }))

import { query, queryConn, withTransaction } from '@/lib/db'
import { auth } from '@/auth'

const makeRequest = (method, body = null) =>
  new NextRequest('http://localhost/api/accounts/1', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })

const params = { id: '1' }

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('PUT /api/accounts/[id]', () => {
  it('returns 200 when account is updated without balance', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank' }),
      { params },
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Account updated')
  })

  it('returns 200 and uses query directly when balance provided without createTransaction', async () => {
    query.mockResolvedValue({ affectedRows: 1 })

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank', balance: 200, createTransaction: false }),
      { params },
    )

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalled()
    expect(withTransaction).not.toHaveBeenCalled()
  })

  it('returns 200 and uses withTransaction when balance changes with createTransaction', async () => {
    query.mockResolvedValueOnce([{ balance: '100.00' }])
    withTransaction.mockImplementation(async (cb) => {
      queryConn.mockResolvedValue({ affectedRows: 1 })
      return cb({})
    })

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank', balance: 200, createTransaction: true }),
      { params },
    )

    expect(res.status).toBe(200)
    expect(withTransaction).toHaveBeenCalled()
  })

  it('returns 404 when account does not exist', async () => {
    query.mockResolvedValue({ affectedRows: 0 })

    const res = await PUT(
      makeRequest('PUT', { name: 'Updated', currency: 'USD', type: 'bank' }),
      { params },
    )

    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await PUT(
      makeRequest('PUT', { name: 'X', currency: 'USD', type: 'bank' }),
      { params },
    )
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/accounts/[id]', () => {
  it('returns 200 when account is deleted', async () => {
    query.mockResolvedValueOnce([{ image_path: null }]) // SELECT image_path
    query.mockResolvedValueOnce({ affectedRows: 1 })    // DELETE

    const res = await DELETE(makeRequest('DELETE'), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Account deleted')
  })

  it('returns 404 when account does not exist', async () => {
    query.mockResolvedValueOnce([]) // SELECT returns empty array

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })
})
