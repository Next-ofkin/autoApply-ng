import { Worker, Job } from 'bullmq'
import { redis } from './redis'
import { prisma } from '../db/client'
import { sendJobAlert, sendPDF } from '../notifier/telegram'
import { tailorCVForJob, saveTailoredOutput } from '../cv-tailor/tailor'
import { generatePDF } from '../pdf-generator/generator'
import { JOBS } from './queues'

export function startWorker(): Worker {
  const worker = new Worker('job-pipeline', async (job: Job) => {
    console.log('[Worker] Processing: ' + job.name)

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

          console.log('[Worker] Tailoring CV for: ' + raw.title + ' at ' + raw.company)
          const tailored = await tailorCVForJob(raw.title, raw.company, raw.description)
          saveTailoredOutput(raw.jobId, tailored)
          const pdfPath = await generatePDF(tailored.cv, raw.jobId)

          await sendJobAlert({
            jobTitle: raw.title,
            company: raw.company,
            location: raw.location,
            platform: raw.platform || 'Remote',
            applyUrl: raw.applyUrl,
            postedDate: raw.postedDate || 'Recently',
          })

          await sendPDF(pdfPath, 'Tailored CV for ' + raw.title + ' at ' + raw.company)

          await prisma.job.update({
            where: { jobId: raw.jobId },
            data: { status: 'APPLIED', tailoredCvPath: pdfPath },
          })

          console.log('[Worker] Done: ' + raw.title + ' at ' + raw.company)
          await new Promise(r => setTimeout(r, 4000))

        } catch (err: any) {
          console.error('[Worker] Error for ' + raw.title + ': ' + err.message)
          await new Promise(r => setTimeout(r, 4000))
        }
      }
      return { notified: jobs.length }
    }
  }, { connection: redis, concurrency: 1 })

  worker.on('completed', job => console.log('[Worker] Done: ' + job.name))
  worker.on('failed', (job, err) => console.error('[Worker] Failed: ' + (job && job.name) + ' - ' + err.message))
  return worker
}
