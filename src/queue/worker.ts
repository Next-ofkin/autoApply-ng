import { Worker, Job } from 'bullmq'
import { redis } from './redis'
import { prisma } from '../db/client'
import { sendJobAlert, sendPDF } from '../notifier/telegram'
import { scoreJobMatch, tailorCVForJob, saveTailoredOutput } from '../cv-tailor/tailor'
import { generatePDF } from '../pdf-generator/generator'
import { JOBS } from './queues'

const MIN_MATCH_SCORE = Number(process.env.MIN_MATCH_SCORE) || 72

export function startWorker(): Worker {
  const worker = new Worker('job-pipeline', async (job: Job) => {
    console.log('[Worker] Processing: ' + job.name)
    if (job.name === JOBS.SEARCH_JOBS) {
      const { jobs } = job.data
      let sent = 0
      let skipped = 0
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
          await new Promise(r => setTimeout(r, 3000))
          const match = await scoreJobMatch(raw.title, raw.company, raw.description)
          if (!match.shouldApply || match.score < MIN_MATCH_SCORE) {
            console.log('[Worker] Skipped (' + match.score + '%): ' + raw.title)
            await prisma.job.update({
              where: { jobId: raw.jobId },
              data: { status: 'SKIPPED', errorMessage: 'Match: ' + match.score + '%' },
            })
            skipped++
            await new Promise(r => setTimeout(r, 2000))
            continue
          }
          console.log('[Worker] Match ' + match.score + '% - Tailoring: ' + raw.title)
          await new Promise(r => setTimeout(r, 3000))
          const tailored = await tailorCVForJob(raw.title, raw.company, raw.description)
          saveTailoredOutput(raw.jobId, tailored)
          const pdfPath = await generatePDF(tailored.cv, raw.jobId)
          const reasonsText = match.reasons.slice(0, 2).join(' | ')
          await sendJobAlert({
            jobTitle: raw.title,
            company: raw.company,
            location: raw.location,
            platform: raw.platform || 'Remote',
            applyUrl: raw.applyUrl,
            postedDate: raw.postedDate || 'Recently',
            matchScore: match.score,
            matchReasons: reasonsText,
          })
          await sendPDF(pdfPath, 'CV - ' + match.score + '% match: ' + raw.title + ' at ' + raw.company)
          await prisma.job.update({
            where: { jobId: raw.jobId },
            data: { status: 'APPLIED', tailoredCvPath: pdfPath },
          })
          sent++
          console.log('[Worker] Sent (' + match.score + '%): ' + raw.title)
          await new Promise(r => setTimeout(r, 3000))
        } catch (err: any) {
          console.error('[Worker] Error for ' + raw.title + ': ' + err.message)
          await new Promise(r => setTimeout(r, 3000))
        }
      }
      console.log('[Worker] Run complete - Sent: ' + sent + ' | Skipped: ' + skipped)
      return { sent, skipped }
    }
  }, { connection: redis, concurrency: 1 })
  worker.on('completed', job => console.log('[Worker] Done: ' + job.name))
  worker.on('failed', (job, err) => console.error('[Worker] Failed: ' + (job && job.name) + ' - ' + err.message))
  return worker
}
