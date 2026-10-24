import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

export async function hashAdminPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyAdminPassword(password, stored) {
  const [algorithm, salt, expectedHex, ...extra] = stored.split('$')
  if (algorithm !== 'scrypt' || !salt || !expectedHex || extra.length
    || !/^[\da-f]{32}$/.test(salt) || !/^[\da-f]{128}$/.test(expectedHex)) {
    return false
  }
  const derived = await scrypt(password, salt, 64)
  return timingSafeEqual(derived, Buffer.from(expectedHex, 'hex'))
}

export function isValidAdminEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidAdminPassword(password) {
  return password.length >= 12 && password.length <= 200
}
