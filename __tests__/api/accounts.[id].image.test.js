/**
 * @jest-environment node
 */
import { POST, DELETE } from '@/app/api/accounts/[id]/image/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({ query: jest.fn() }))
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { query } from '@/lib/db'
import { auth } from '@/auth'

const params = { id: '1' }

const makeFormRequest = (file = null) => {
  const fd = new FormData()
  if (file) fd.append('image', file)
  return new NextRequest('http://localhost/api/accounts/1/image', { method: 'POST', body: fd })
}

const makeFile = (name = 'photo.jpg', type = 'image/jpeg', size = 1024) =>
  new File([new Uint8Array(size)], name, { type })

const makeDeleteRequest = () =>
  new NextRequest('http://localhost/api/accounts/1/image', { method: 'DELETE' })

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1 } })
})

describe('POST /api/accounts/[id]/image', () => {
  it('returns 200 with image_path when file is valid', async () => {
    query
      .mockResolvedValueOnce([{ image_path: null }]) // SELECT account
      .mockResolvedValueOnce({ affectedRows: 1 })    // UPDATE image_path

    const res = await POST(makeFormRequest(makeFile()), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.image_path).toMatch(/^\/account-images\/account_1_\d+\.jpg$/)
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('selects existing image before saving new one', async () => {
    query
      .mockResolvedValueOnce([{ image_path: '/account-images/old.jpg' }])
      .mockResolvedValueOnce({ affectedRows: 1 })

    const res = await POST(makeFormRequest(makeFile()), { params })

    expect(res.status).toBe(200)
    // First query must be SELECT (to get old image_path for cleanup)
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT'),
      expect.arrayContaining(['1', 1]),
    )
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await POST(makeFormRequest(makeFile()), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when account not found', async () => {
    query.mockResolvedValueOnce([])

    const res = await POST(makeFormRequest(makeFile()), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when no file is provided', async () => {
    query.mockResolvedValueOnce([{ image_path: null }])

    const res = await POST(makeFormRequest(), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no file/i)
  })

  it('returns 400 when file type is invalid', async () => {
    query.mockResolvedValueOnce([{ image_path: null }])

    const res = await POST(makeFormRequest(makeFile('doc.pdf', 'application/pdf')), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid file type/i)
  })

  it('returns 400 when file exceeds 5MB', async () => {
    query.mockResolvedValueOnce([{ image_path: null }])

    const res = await POST(makeFormRequest(makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024)), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/too large/i)
  })
})

describe('DELETE /api/accounts/[id]/image', () => {
  it('returns 200 and clears image_path in DB', async () => {
    query
      .mockResolvedValueOnce([{ image_path: '/account-images/test.jpg' }])
      .mockResolvedValueOnce({ affectedRows: 1 })

    const res = await DELETE(makeDeleteRequest(), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBe('Image removed')
    // UPDATE must set image_path = NULL
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('NULL'),
      expect.arrayContaining(['1', 1]),
    )
  })

  it('returns 200 when account has no existing image', async () => {
    query
      .mockResolvedValueOnce([{ image_path: null }])
      .mockResolvedValueOnce({ affectedRows: 1 })

    const res = await DELETE(makeDeleteRequest(), { params })
    expect(res.status).toBe(200)
  })

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null)

    const res = await DELETE(makeDeleteRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when account not found', async () => {
    query.mockResolvedValueOnce([])

    const res = await DELETE(makeDeleteRequest(), { params })
    expect(res.status).toBe(404)
  })
})
