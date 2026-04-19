import { Worker, Job } from 'bullmq'
import { redis } from './redis'
import { prisma } from '../db/client'
import { tailorCVForJob, saveTailoredOutput } from '../cv-tailor/tailor'
import { generatePDF } from '../pdf-generator/generator'
import { applyToJob } from '../playwright-bot/apply'
import { sendApplicationEmail } from '../notifier/email'
import { JOBS } from './queues'

export function startWorker(): Worker {
  const worker = new Worker('job-pipeline', async (job: Job) => {
    console.log(`[Worker] Processing: ${job.name}`)

    if (job.name === JOBS.TAILOR_CV) {
      const { dbJobId, jobId, title, company, description } = job.data
      await prisma.job.update({ where: { id: dbJobId }, data: { status: 'TAILORING' } })
      const tailored = await tailorCVForJob(title, company, description)
      saveTailoredOutput(jobId, tailored)
      const pdfPath = await generatePDF(tailored.cv, jobId)
      await prisma.job.update({ where: { id: dbJobId }, data: { status: 'READY', tailoredCvPath: pdfPath } })
      return { pdfPath, coverLetter: tailored.coverLetter }
    }

    if (job.name === JOBS.APPLY_JOB) {
      const { dbJobId, pdfPath, coverLetter, title, company, location, applyUrl } = job.data
      await prisma.job.update({ where: { id: dbJobId }, data: { status: 'APPLYING' } })
      const result = await applyToJob(applyUrl, pdfPath, coverLetter, title, company)
      await prisma.job.update({
        where: { id: dbJobId },
        data: result.success
          ? { status: 'APPLIED', appliedAt: new Date() }
          : { status: 'FAILED', errorMessage: result.error },
      })
      await sendApplicationEmail({ jobTitle: title, company, location, applyUrl, success: result.success, error: result.error })
      return result
    }
  }, { connection: redis, concurrency: 1 })

  worker.on('completed', job => console.log(`[Worker] Done: ${job.name}`))
  worker.on('failed', (job, err) => console.error(`[Worker] Failed: ${job?.name} — ${err.message}`))
  return worker
}