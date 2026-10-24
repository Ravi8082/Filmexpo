import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hashAdminPassword,
  isValidAdminEmail,
  isValidAdminPassword,
  verifyAdminPassword,
} from '../lib/admin-password.mjs'

test('stores passwords as salted scrypt hashes and verifies them', async () => {
  const password = 'a secure test password'
  const hash = await hashAdminPassword(password)

  assert.match(hash, /^scrypt\$[\da-f]{32}\$[\da-f]{128}$/)
  assert.notEqual(hash, password)
  assert.equal(await verifyAdminPassword(password, hash), true)
  assert.equal(await verifyAdminPassword('incorrect password', hash), false)
})

test('rejects malformed stored password hashes', async () => {
  assert.equal(await verifyAdminPassword('password', 'plaintext'), false)
  assert.equal(await verifyAdminPassword('password', 'scrypt$bad$hash'), false)
  assert.equal(await verifyAdminPassword('password', 'scrypt$' + 'a'.repeat(32) + '$' + 'b'.repeat(128) + '$extra'), false)
})

test('validates admin emails and password lengths', () => {
  assert.equal(isValidAdminEmail('admin@example.com'), true)
  assert.equal(isValidAdminEmail('invalid-email'), false)
  assert.equal(isValidAdminEmail(`a@${'b'.repeat(250)}.com`), false)
  assert.equal(isValidAdminPassword('123456789012'), true)
  assert.equal(isValidAdminPassword('short'), false)
  assert.equal(isValidAdminPassword('x'.repeat(201)), false)
})
