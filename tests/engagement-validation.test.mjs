import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEngagementInput } from '../lib/engagement-validation.mjs'

test('normalizes a valid registration email', () => {
  assert.deepEqual(parseEngagementInput({
    type: 'registration',
    email: '  Visitor@Example.com ',
    privacyAccepted: true,
  }), {
    type: 'registration',
    email: 'visitor@example.com',
    marketingConsent: false,
  })
})

test('requires separate newsletter marketing consent', () => {
  assert.equal(parseEngagementInput({
    type: 'newsletter',
    email: 'visitor@example.com',
    privacyAccepted: true,
    marketingConsent: false,
  }), null)
})

test('rejects invalid types, email addresses, and missing privacy acceptance', () => {
  assert.equal(parseEngagementInput({ type: 'other', email: 'a@example.com', privacyAccepted: true }), null)
  assert.equal(parseEngagementInput({ type: 'registration', email: 'not-an-email', privacyAccepted: true }), null)
  assert.equal(parseEngagementInput({ type: 'registration', email: 'a@example.com' }), null)
  assert.equal(parseEngagementInput([]), null)
})
