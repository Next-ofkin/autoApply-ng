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

const TARGET_ROLES = (process.env.TARGET_ROLES || 'full-stack,frontend,react,node,python,typescript')
  .split(',').map((r: string) => r.trim())

export async function searchAllJobs(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []

  const results = await Promise.allSettled([
    searchRemotive(),
    searchArbeitnow(),
    searchHimalayas(),
    searchTheMuse(),
    searchWeWorkRemotely(),
  ])

  for (const r of results) {
    if (r.status === 'fulfilled') allJobs.push(...r.value)
    else console.error('[Searcher] Platform error:', r.reason?.message)
  }

  const deduped = deduplicateJobs(allJobs)
  const fresh = await filterAlreadyNotified(deduped)
  console.log('[Searcher] ' + allJobs.length + ' total, ' + deduped.length + ' deduped, ' + fresh.length + ' new')
  return fresh
}

async function searchRemotive(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  for (const role of TARGET_ROLES) {
    try {
      const { data } = await axios.get('https://remotive.com/api/remote-jobs', {
        params: { search: role, limit: 10 },
        timeout: 15000,
      })
      if (!data.jobs) continue
      for (const item of data.jobs) {
        if (new Date(item.publication_date) < oneWeekAgo) continue
        jobs.push({
          jobId: 'remotive-' + item.id,
          title: item.title || 'Unknown Role',
          company: item.company_name || 'Unknown',
          location: item.candidate_required_location || 'Remote / Worldwide',
          applyUrl: item.url || '',
          description: item.description || '',
          platform: 'Remotive',
          postedDate: new Date(item.publication_date).toLocaleDateString('en-NG'),
        })
      }
    } catch (err: any) {
      console.error('[Remotive] Error for ' + role + ': ' + err.message)
    }
  }
  console.log('[Remotive] ' + jobs.length + ' total jobs')
  return jobs
}

async function searchArbeitnow(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const { data } = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
      params: { page: 1 },
      timeout: 15000,
    })
    if (!data.data) return jobs
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    for (const item of data.data) {
      const postedAt = new Date(item.created_at * 1000)
      if (postedAt < oneWeekAgo) continue
      const titleLower = (item.title || '').toLowerCase()
      const isRelevant = TARGET_ROLES.some((r: string) => titleLower.includes(r.toLowerCase()))
      if (!isRelevant) continue
      jobs.push({
        jobId: 'arbeitnow-' + item.slug,
        title: item.title || 'Unknown Role',
        company: item.company_name || 'Unknown',
        location: item.location || 'Remote',
        applyUrl: item.url || '',
        description: item.description || '',
        platform: 'Arbeitnow',
        postedDate: postedAt.toLocaleDateString('en-NG'),
      })
    }
  } catch (err: any) {
    console.error('[Arbeitnow] Error: ' + err.message)
  }
  console.log('[Arbeitnow] ' + jobs.length + ' relevant jobs')
  return jobs
}

async function searchHimalayas(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    for (const role of TARGET_ROLES.slice(0, 3)) {
      const { data } = await axios.get('https://himalayas.app/jobs/api', {
        params: { q: role, limit: 10 },
        timeout: 15000,
      })
      if (!data.jobs) continue
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      for (const item of data.jobs) {
        const postedAt = new Date(item.createdAt)
        if (postedAt < oneWeekAgo) continue
        jobs.push({
          jobId: 'himalayas-' + item.id,
          title: item.title || 'Unknown Role',
          company: (item.company && item.company.name) || 'Unknown',
          location: item.location || 'Remote / Worldwide',
          applyUrl: item.applicationLink || item.url || '',
          description: item.description || '',
          platform: 'Himalayas',
          postedDate: postedAt.toLocaleDateString('en-NG'),
        })
      }
    }
  } catch (err: any) {
    console.error('[Himalayas] Error: ' + err.message)
  }
  console.log('[Himalayas] ' + jobs.length + ' jobs')
  return jobs
}

async function searchTheMuse(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    for (const role of TARGET_ROLES.slice(0, 3)) {
      const { data } = await axios.get('https://www.themuse.com/api/public/jobs', {
        params: { category: 'Engineering', level: 'Entry Level', page: 0 },
        timeout: 15000,
      })
      if (!data.results) continue
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      for (const item of data.results) {
        const postedAt = new Date(item.publication_date)
        if (postedAt < oneWeekAgo) continue
        const titleLower = (item.name || '').toLowerCase()
        const isRelevant = TARGET_ROLES.some((r: string) => titleLower.includes(r.toLowerCase()))
        if (!isRelevant) continue
        jobs.push({
          jobId: 'muse-' + item.id,
          title: item.name || 'Unknown Role',
          company: (item.company && item.company.name) || 'Unknown',
          location: (item.locations && item.locations[0] && item.locations[0].name) || 'Remote',
          applyUrl: item.refs && item.refs.landing_page ? item.refs.landing_page : '',
          description: item.contents || '',
          platform: 'The Muse',
          postedDate: postedAt.toLocaleDateString('en-NG'),
        })
      }
    }
  } catch (err: any) {
    console.error('[TheMuse] Error: ' + err.message)
  }
  console.log('[TheMuse] ' + jobs.length + ' jobs')
  return jobs
}

async function searchWeWorkRemotely(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const { data } = await axios.get('https://weworkremotely.com/remote-jobs.json', {
      timeout: 15000,
    })
    if (!Array.isArray(data)) return jobs
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    for (const item of data) {
      const postedAt = new Date(item.created_at)
      if (postedAt < oneWeekAgo) continue
      const titleLower = (item.title || '').toLowerCase()
      const isRelevant = TARGET_ROLES.some((r: string) => titleLower.includes(r.toLowerCase()))
      if (!isRelevant) continue
      jobs.push({
        jobId: 'wwr-' + item.id,
        title: item.title || 'Unknown Role',
        company: item.company || 'Unknown',
        location: item.region || 'Remote / Worldwide',
        applyUrl: item.url || '',
        description: item.description || '',
        platform: 'We Work Remotely',
        postedDate: postedAt.toLocaleDateString('en-NG'),
      })
    }
  } catch (err: any) {
    console.error('[WeWorkRemotely] Error: ' + err.message)
  }
  console.log('[WeWorkRemotely] ' + jobs.length + ' relevant jobs')
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
