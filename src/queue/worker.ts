import { Worker, Job } from 'bullmq'
import { redis } from './redis'
import { prisma } from '../db/client'
import { sendJobAlert } from '../notifier/telegram'
import { JOBS } from './queues'

export function startWorker(): Worker {
  const worker = new Worker('job-pipeline', async (job: Job) => {
    console.log(`[Worker] Processing: ${job.name}`)

    if (job.name === JOBS.SEARCH_JOBS) {
      const { jobs } = job.data

      for (const raw of jobs) {
        try {
          await prisma.job.upsert({
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

          await sendJobAlert({
            jobTitle: raw.title,
            company: raw.company,
            location: raw.location,
            platform: raw.platform || 'Indeed',
            applyUrl: raw.applyUrl,
            postedDate: raw.postedDate || 'Recently',
          })

          await prisma.job.update({
            where: { jobId: raw.jobId },
            data: { status: 'APPLIED' },
          })

          console.log(`[Worker] Notified: ${raw.title} at ${raw.company}`)
          await new Promise(r => setTimeout(r, 2000))
        } catch (err: any) {
          console.error(`[Worker] Error processing ${raw.title}:`, err.message)
        }
      }

      return { notified: jobs.length }
    }

  }, { connection: redis, concurrency: 1 })

  worker.on('completed', job => console.log(`[Worker] Done: ${job.name}`))
  worker.on('failed', (job, err) => console.error(`[Worker] Failed: ${job?.name} — ${err.message}`))
  return worker
}