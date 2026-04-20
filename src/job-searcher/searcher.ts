import axios from 'axios'
import { prisma } from '../db/client'

export interface RawJob {
  jobId: string
  title: string
  company: string
  location: string
  applyUrl: string
  description: string
  platform: string
  postedDate: string
}

const TARGET_ROLES = (process.env.TARGET_ROLES || 'Full Stack Developer,Frontend Developer,IT Support')
  .split(',').map((r: string) => r.trim())

const APP_ID = process.env.ADZUNA_APP_ID || ''
const APP_KEY = process.env.ADZUNA_APP_KEY || ''

export async function searchAllJobs(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []

  for (const role of TARGET_ROLES) {
    console.log('[Searcher] Searching: ' + role)
    try {
      const jobs = await searchAdzuna(role)
      allJobs.push(...jobs)
    } catch (err: any) {
      console.error('[Searcher] Adzuna error for ' + role + ': ' + err.message)
    }
  }

  const deduped = deduplicateJobs(allJobs)
  const fresh = await filterAlreadyNotified(deduped)
  console.log('[Searcher] ' + allJobs.length + ' total, ' + deduped.length + ' deduped, ' + fresh.length + ' new')
  return fresh
}

async function searchAdzuna(role: string): Promise<RawJob[]> {
  const url = 'https://api.adzuna.com/v1/api/jobs/ng/search/1'
  const params = {
    app_id: APP_ID,
    app_key: APP_KEY,
    what: role,
    where: 'Lagos',
    results_per_page: 20,
    max_days_old: 7,
    sort_by: 'date',
  }

  const { data } = await axios.get(url, { params, timeout: 15000 })
  const jobs: RawJob[] = []

  if (!data.results) return jobs

  for (const item of data.results) {
    const postedDate = item.created
      ? new Date(item.created).toLocaleDateString('en-NG')
      : 'Recently'

    jobs.push({
      jobId: 'adzuna-' + item.id,
      title: item.title || 'Unknown Role',
      company: (item.company && item.company.display_name) || 'Unknown Company',
      location: (item.location && item.location.display_name) || 'Lagos, Nigeria',
      applyUrl: item.redirect_url || '',
      description: item.description || '',
      platform: 'Adzuna',
      postedDate,
    })
  }

  console.log('[Adzuna] ' + jobs.length + ' jobs for ' + role)
  return jobs
}

function deduplicateJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>()
  return jobs.filter((job: RawJob) => {
    const key = job.title.toLowerCase().trim() + '-' + job.company.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function filterAlreadyNotified(jobs: RawJob[]): Promise<RawJob[]> {
  const existing = await prisma.job.findMany({
    where: { jobId: { in: jobs.map((j: RawJob) => j.jobId) } },
    select: { jobId: true },
  })
  const seen = new Set(existing.map((j: any) => j.jobId))
  return jobs.filter((j: RawJob) => !seen.has(j.jobId))
}
