import cron from 'node-cron'
import { searchAllJobs } from '../job-searcher/searcher'
import { jobQueue, JOBS } from '../queue/queues'
import { sendDailySummary } from '../notifier/telegram'
import { prisma } from '../db/client'

const SCHEDULE = process.env.CRON_SCHEDULE || '0 */6 * * *'

export function startScheduler(): void {
  console.log('[Scheduler] Schedule: ' + SCHEDULE)
  cron.schedule(SCHEDULE, runPipeline)
  cron.schedule('0 20 * * *', sendSummary)
  console.log('[Scheduler] First run in 15 seconds...')
  setTimeout(runPipeline, 15000)
}

async function runPipeline(): Promise<void> {
  const now = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
  console.log('\n[Scheduler] ===== RUN @ ' + now + ' =====')
  try {
    const jobs = await searchAllJobs()
    if (!jobs.length) {
      console.log('[Scheduler] No new jobs found.')
      return
    }
    console.log('[Scheduler] Found ' + jobs.length + ' new jobs')
    await jobQueue.add(JOBS.SEARCH_JOBS, { jobs })
  } catch (err: any) {
    console.error('[Scheduler] Error:', err.message)
  }
}

async function sendSummary(): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const found = await prisma.job.count({ where: { createdAt: { gte: today } } })
  await sendDailySummary({
    found,
    platforms: ['Indeed', 'Jobberman', 'MyJobMag'],
  })
}