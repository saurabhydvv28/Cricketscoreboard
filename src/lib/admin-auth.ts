import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret(): Uint8Array {
  const pin = process.env.ADMIN_PIN
  if (!pin) {
    throw new Error(
      'ADMIN_PIN environment variable is not set. ' +
        'Add it to your .env.local and Vercel environment variables.'
    )
  }
  // Pad/hash the PIN into a 32-byte key
  const padded = pin.padEnd(32, '0').slice(0, 32)
  return new TextEncoder().encode(padded)
}

export async function createAdminSession(): Promise<void> {
  const secret = getSecret()
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return false

    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAdminSessionFromRequest(
  cookieHeader: string | null
): Promise<boolean> {
  if (!cookieHeader) return false
  try {
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    const token = match?.[1]
    if (!token) return false

    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}
