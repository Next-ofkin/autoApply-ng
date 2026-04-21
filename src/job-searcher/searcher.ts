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
    searchRemoteOK(),
    searchJobicy(),
    searchLinkedInRSS(),
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
  console.log('[Remotive] ' + jobs.length + ' jobs')
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
  console.log('[Arbeitnow] ' + jobs.length + ' jobs')
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

async function searchRemoteOK(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const { data } = await axios.get('https://remoteok.com/api', {
      headers: { 'User-Agent': 'autoApply-ng Job Bot' },
      timeout: 15000,
    })
    if (!Array.isArray(data)) return jobs
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    for (const item of data) {
      if (!item.id || !item.position) continue
      const postedAt = new Date(item.date)
      if (postedAt < oneWeekAgo) continue
      const titleLower = (item.position || '').toLowerCase()
      const tagStr = (item.tags || []).join(' ').toLowerCase()
      const isRelevant = TARGET_ROLES.some((r: string) =>
        titleLower.includes(r.toLowerCase()) || tagStr.includes(r.toLowerCase())
      )
      if (!isRelevant) continue
      jobs.push({
        jobId: 'remoteok-' + item.id,
        title: item.position || 'Unknown Role',
        company: item.company || 'Unknown',
        location: 'Remote / Worldwide',
        applyUrl: item.apply_url || item.url || '',
        description: item.description || '',
        platform: 'RemoteOK',
        postedDate: postedAt.toLocaleDateString('en-NG'),
      })
    }
  } catch (err: any) {
    console.error('[RemoteOK] Error: ' + err.message)
  }
  console.log('[RemoteOK] ' + jobs.length + ' jobs')
  return jobs
}

async function searchJobicy(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const { data } = await axios.get('https://jobicy.com/api/v2/remote-jobs', {
      params: { count: 20, geo: 'worldwide', industry: 'engineering' },
      timeout: 15000,
    })
    if (!data.jobs) return jobs
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    for (const item of data.jobs) {
      const postedAt = new Date(item.jobPubDate)
      if (postedAt < oneWeekAgo) continue
      const titleLower = (item.jobTitle || '').toLowerCase()
      const isRelevant = TARGET_ROLES.some((r: string) => titleLower.includes(r.toLowerCase()))
      if (!isRelevant) continue
      jobs.push({
        jobId: 'jobicy-' + item.id,
        title: item.jobTitle || 'Unknown Role',
        company: item.companyName || 'Unknown',
        location: item.jobGeo || 'Remote / Worldwide',
        applyUrl: item.url || '',
        description: item.jobExcerpt || '',
        platform: 'Jobicy',
        postedDate: postedAt.toLocaleDateString('en-NG'),
      })
    }
  } catch (err: any) {
    console.error('[Jobicy] Error: ' + err.message)
  }
  console.log('[Jobicy] ' + jobs.length + ' jobs')
  return jobs
}

async function searchLinkedInRSS(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    for (const role of TARGET_ROLES.slice(0, 3)) {
      const encoded = encodeURIComponent(role)
      const url = 'https://www.linkedin.com/jobs/search/?keywords=' + encoded + '&f_TPR=r604800&f_WT=2'
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      })
      const cheerio = require('cheerio')
      const $ = cheerio.load(data)
      $('div.base-card').each((_: any, el: any) => {
        const title = $(el).find('.base-search-card__title').text().trim()
        const company = $(el).find('.base-search-card__subtitle').text().trim()
        const location = $(el).find('.job-search-card__location').text().trim()
        const href = $(el).find('a.base-card__full-link').attr('href') || ''
        const jobId = href.split('-').pop() || ''
        if (!title || !href) return
        jobs.push({
          jobId: 'linkedin-' + jobId,
          title,
          company: company || 'Unknown',
          location: location || 'Remote',
          applyUrl: href,
          description: title + ' at ' + company,
          platform: 'LinkedIn',
          postedDate: 'This week',
        })
      })
    }
  } catch (err: any) {
    console.error('[LinkedIn] Error: ' + err.message)
  }
  console.log('[LinkedIn] ' + jobs.length + ' jobs')
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
