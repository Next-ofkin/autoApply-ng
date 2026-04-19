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
        create: { jobId: raw.jobId, title: raw.title, company: raw.company, location: raw.location, applyUrl: raw.applyUrl, description: raw.description, status: 'FOUND' },
        update: {},
      })
      const tailorJob = await jobQueue.add(JOBS.TAILOR_CV, { dbJobId: db.id, jobId: raw.jobId, title: raw.title, company: raw.company, location: raw.location, description: raw.description, applyUrl: raw.applyUrl })
      await jobQueue.add(JOBS.APPLY_JOB, { dbJobId: db.id, title: raw.title, company: raw.company, location: raw.location, applyUrl: raw.applyUrl }, { delay: 45000 })
    }
  } catch (err: any) {
    console.error('[Scheduler] Error:', err.message)
  }
}

async function sendSummary(): Promise<void> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [applied, failed, total] = await Promise.all([
    prisma.job.count({ where: { status: 'APPLIED', appliedAt: { gte: today } } }),
    prisma.job.count({ where: { status: 'FAILED', updatedAt: { gte: today } } }),
    prisma.job.count({ where: { createdAt: { gte: today } } }),
  ])
  await sendDailySummaryEmail({ applied, failed, total })
}