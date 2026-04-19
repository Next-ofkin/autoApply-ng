import cron from 'node-cron'
import { searchIndeedJobs } from '../job-searcher/searcher'
import { jobQueue, JOBS } from '../queue/queues'
import { prisma } from '../db/client'
import { sendDailySummaryEmail } from '../notifier/email'

const MAX = Number(process.env.MAX_APPLICATIONS_PER_RUN) || 5
const SCHEDULE = process.env.CRON_SCHEDULE || '0 */6 * * *'

export function startScheduler(): void {
  console.log(`[Scheduler] Schedule: ${SCHEDULE}`)
  cron.schedule(SCHEDULE, runPipeline)
  cron.schedule('0 20 * * *', sendSummary)
  console.log('[Scheduler] First run in 15 seconds...')
  setTimeout(runPipeline, 15000)
}

async function runPipeline(): Promise<void> {
  console.log(`\n[Scheduler] ===== RUN @ ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} =====`)
  try {
    const jobs = await searchIndeedJobs()
    if (!jobs.length) { console.log('[Scheduler] No new jobs found.'); return }
    const limited = jobs.slice(0, MAX)
    console.log(`[Scheduler] Queuing ${limited.length} jobs`)
    for (const raw of limited) {
      const db = await prisma.job.upsert({
        where: { jobId: raw.jobId },
        create: {
          jobId: raw.jobId,
          title: raw.title,
          company: raw.company,
          location: raw.location,
          applyUrl: raw.applyUrl,
          description: raw.description,
          status: 'FOUND',
        },
        update: {},
      })
      await jobQueue.add(JOBS.TAILOR_CV, {
        dbJobId: db.id,
        jobId: raw.jobId,
        title: raw.title,
        company: raw.company,
        location: raw.location,
        description: raw.description,
        applyUrl: raw.applyUrl,
      })
    }
  } catch (err: any) {
    console.error('[Scheduleimport cron from 'node-cron'
import { searchAllJobs } from '../job-searcher/searcher'
import { jobQueue, JOBS } from '../queue/queues'
import { sendDailySummary } from '../notifier/telegram'
import { prisma } from '../db/client'

const SCHEDULE = process.env.CRON_SCHEDULE || '0 */6 * * *'

export function startScheduler(): void {
  console.log(`[Scheduler] Schedule: ${SCHEDULE}`)
  cron.schedule(SCHEDULE, runPipeline)
  cron.schedule('0 20 * * *', sendSummary)
  console.log('[Scheduler] First run in 15 seconds...')
  setTimeout(runPipeline, 15000)
}

async function runPipeline(): Promise<void> {
  console.log(`\n[Scheduler] ===== RUN @ ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} =====`)
  try {
    const jobs = await searchAllJobs()
    if (!jobs.length) {
      console.log('[Scheduler] No new jobs found.')
      return
    }
    console.log(`[Scheduler] Found ${jobs.length} new jobs — sending Telegram alerts`)
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
}r] Error:', err.message)
  }
}

async function sendSummary(): Promise<void> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [applied, faileimport cron from 'node-cron'
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
    console.log('[Scheduler] Found ' + jobs.length + ' new jobs — sending Telegram alerts')
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
}d, total] = await Promise.all([
    prisma.job.count({ where: { status: 'APPLIED', appliedAt: { gte: today } } }),
    prisma.job.count({ where: { status: 'FAILED', updatedAt: { gte: today } } }),
    prisma.job.count({ where: { createdAt: { gte: today } } }),
  ])
  await sendDailySummaryEmail({ applied, failed, total })
}