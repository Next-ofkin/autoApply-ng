import 'dotenv/config'
import { startWorker } from './queue/worker'
import { startScheduler } from './cron/scheduler'
import { prisma } from './db/client'
import { closeBrowser } from './playwright-bot/apply'

console.log(`
╔══════════════════════════════════════╗
║        autoApply-ng  v1.0.0          ║
║   Automated Job Application Bot      ║
║   Lagos, Nigeria — Running 24/7      ║
╚══════════════════════════════════════╝
`)

async function main() {
  await prisma.$connect()
  console.log('[App] Database connected ✅')
  startWorker()
  console.log('[App] Worker started ✅')
  startScheduler()
  console.log('[App] Scheduler started ✅')

  const shutdown = async (sig: string) => {
    console.log(`\n[App] ${sig} — shutting down...`)
    await closeBrowser()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(err => { console.error('[App] Fatal:', err); process.exit(1) })