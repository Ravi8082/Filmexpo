import { createPool, type Pool } from 'mysql2/promise'

declare global {
  var filmExpoMysqlPool: Pool | undefined
}

export function getPool() {
  if (globalThis.filmExpoMysqlPool) return globalThis.filmExpoMysqlPool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Configure it in .env.local before starting the site.')
  }

  const url = new URL(connectionString)
  if (url.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use the mysql:// protocol.')
  }

  const pool = createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 280_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  })

  globalThis.filmExpoMysqlPool = pool
  return pool
}
