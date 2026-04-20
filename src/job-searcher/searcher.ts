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

const TARGET_ROLES = (process.env.TARGET_ROLES || 'full-stack,frontend,react,node,python')
  .split(',').map((r: string) => r.trim())

export async function searchAllJobs(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []
  for (const role of TARGET_ROLES) {
    console.log('[Searcher] Searching: ' + role)
    try {
      const jobs = await searchRemotive(role)
      allJobs.push(...jobs)
    } catch (err: any) {
      console.error('[Searcher] Error for ' + role + ': ' + err.message)
    }
  }
  const deduped = deduplicateJobs(allJobs)
  const fresh = await filterAlreadyNotified(deduped)
  console.log('[Searcher] ' + allJobs.length + ' total, ' + deduped.length + ' deduped, ' + fresh.length + ' new')
  return fresh
}

async function searchRemotive(role: string): Promise<RawJob[]> {
  const { data } = await axios.get('https://remotive.com/api/remote-jobs', {
    params: { search: role, limit: 20 },
    timeout: 15000,
  })
  const jobs: RawJob[] = []
  if (!data.jobs) return jobs
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  for (const item of data.jobs) {
    const postedAt = new Date(item.publication_date)
    if (postedAt < oneWeekAgo) continue
    jobs.push({
      jobId: 'remotive-' + item.id,
      title: item.title || 'Unknown Role',
      company: item.company_name || 'Unknown Company',
      location: item.candidate_required_location || 'Remote / Worldwide',
      applyUrl: item.url || '',
      description: item.description || '',
      platform: 'Remotive',
      postedDate: postedAt.toLocaleDateString('en-NG'),
    })
  }
  console.log('[Remotive] ' + jobs.length + ' jobs for ' + role)
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
