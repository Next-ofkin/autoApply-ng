import { startWorker } from './queue/worker'
import { startScheduler } from './cron/scheduler'
import { prisma } from './db/client'
import { redis } from './queue/redis'
import { analyzeCvOnce } from './cv-analyzer/analyzer'

async function main() {
  console.log(`
╔══════════════════════════════════════╗
║        autoApply-ng  v1.1.0          ║
║   Automated Job Application Bot      ║
║   Lagos, Nigeria — Running 24/7      ║
╚══════════════════════════════════════╝`)

  await prisma.$connect()
  console.log('[App] Database connected ✅')

  await analyzeCvOnce()
  console.log('[App] CV Profile ready ✅')

  startWorker()
  console.log('[App] Worker started ✅')

  startScheduler()
  console.log('[App] Scheduler started ✅')
}

redis.on('connect', () => console.log('[Redis] Connected'))
redis.on('error', (err) => console.error('[Redis] Error:', err.message))

main().catch(console.error)
