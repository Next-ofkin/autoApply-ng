import { Queue } from 'bullmq'
import { redis } from './redis'

export const jobQueue = new Queue('job-pipeline', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50, stalledInterval: 300000, maxStalledCount: 3,
  },
})

export const JOBS = {
  SEARCH_JOBS: 'search-jobs',
  TAILOR_CV:   'tailor-cv',
  APPLY_JOB:   'apply-job',
} as const
