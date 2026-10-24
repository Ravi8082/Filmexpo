import type { RowDataPacket } from 'mysql2'
import { createOtpRateKey } from '@/lib/email-otp'
import { getPool } from '@/lib/mysql'

const RATE_WINDOW_MINUTES = 15
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

declare global {
  var filmExpoRateLimitCleanupAt: number | undefined
}

async function cleanupExpiredRateLimits() {
  const now = Date.now()
  if (globalThis.filmExpoRateLimitCleanupAt && now - globalThis.filmExpoRateLimitCleanupAt < CLEANUP_INTERVAL_MS) return
  await getPool().execute(
    'DELETE FROM email_otp_rate_limits WHERE window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)',
  )
  globalThis.filmExpoRateLimitCleanupAt = now
}

export async function incrementEmailOtpRateLimits(values: string[]) {
  if (values.length === 0) return []

  await cleanupExpiredRateLimits()
  const keys = values.map(createOtpRateKey)
  const pool = getPool()
  await pool.execute(
    `INSERT INTO email_otp_rate_limits (rate_key, window_started_at, request_count)
     VALUES ${keys.map(() => '(?, UTC_TIMESTAMP(), 1)').join(', ')}
     ON DUPLICATE KEY UPDATE
       request_count = IF(window_started_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${RATE_WINDOW_MINUTES} MINUTE), 1, request_count + 1),
       window_started_at = IF(window_started_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${RATE_WINDOW_MINUTES} MINUTE), UTC_TIMESTAMP(), window_started_at)`,
    keys,
  )
  const [rows] = await pool.query<Array<RowDataPacket & { request_count: number }>>(
    `SELECT rate_key, request_count FROM email_otp_rate_limits WHERE rate_key IN (${keys.map(() => '?').join(', ')})`,
    keys,
  )
  const counts = new Map(rows.map((row) => [row.rate_key, Number(row.request_count)]))
  return keys.map((key) => counts.get(key) ?? 0)
}

export async function incrementEmailOtpRateLimit(value: string) {
  const [count] = await incrementEmailOtpRateLimits([value])
  return count
}
