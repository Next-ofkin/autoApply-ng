import axios from 'axios'
import * as cheerio from 'cheerio'
import { prisma } from '../db/client'

export interface RawJob {
  jobId:       string
  title:       string
  company:     string
  location:    string
  applyUrl:    string
  description: string
  platform:    string
  postedDate:  string
}

const TARGET_ROLES = (process.env.TARGET_ROLES || 'Full Stack Developer,Frontend Developer,IT Support')
  .split(',').map(r => r.trim())

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function searchAllJobs(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []

  for (const role of TARGET_ROLES) {
    console.log('[Searcher] Searching: "' + role + '"')
    const results = await Promise.allSettled([
      scrapeIndeed(role),
      scrapeJobberman(role),
      scrapeMyJobMag(role),
    ])
    for (const r of results) {
      if (r.status === 'fulfilled') allJobs.push(...r.value)
      else console.error('[Searcher] Platform error:', r.reason?.message)
    }
  }

  const deduped = deduplicateJobs(allJobs)
  const fresh = await filterAlreadyNotified(deduped)
  console.log('[Searcher] ' + allJobs.length + ' total → ' + deduped.length + ' deduped → ' + fresh.length + ' new')
  return fresh
}

function deduplicateJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>()
  return jobs.filter(job => {
    const key = job.title.toLowerCase().trim() + '-' + job.company.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function scrapeIndeed(role: string): Promise<RawJob[]> {
  const url = 'https://ng.indeed.com/jobs?q=' + encodeURIComponent(role) + '&l=Lagos&sort=date&fromage=7'
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 })
  const $ = cheerio.load(data)
  const jobs: RawJob[] = []

  $('[data-jk]').each((_, el) => {
    const jk      = $(el).attr('data-jk') || ''
    const title   = $(el).find('[data-testid="jobTitle"]').text().trim() || $(el).find('.jobTitle').text().trim()
    const company = $(el).find('[data-testid="company-name"]').text().trim() || $(el).find('.companyName').text().trim()
    const location = $(el).find('[data-testid="text-location"]').text().trim() || 'Lagos'
    const posted  = $(el).find('[data-testid="myJobsStateDate"]').text().trim() || 'Recently'
    if (!jk || !title) return
    jobs.push({
      jobId: 'indeed-' + jk,
      title,
      company: company || 'Unknown',
      location,
      applyUrl: 'https://ng.indeed.com/viewjob?jk=' + jk,
      description: title + ' at ' + company,
      platform: 'Indeed',
      postedDate: posted,
    })
  })

  console.log('[Indeed] ' + jobs.length + ' jobs for "' + role + '"')
  return jobs
}

async function scrapeJobberman(role: string): Promise<RawJob[]> {
  const url = 'https://www.jobberman.com/jobs?q=' + encodeURIComponent(role) + '&l=Lagos&date_posted=7d'
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 })
  const $ = cheerio.load(data)
  const jobs: RawJob[] = []

  $('article, .job-item, [class*="JobCard"], [class*="job-card"]').each((_, el) => {
    const title   = $(el).find('h2, h3, [class*="title"]').first().text().trim()
    const company = $(el).find('[class*="company"]').first().text().trim()
    const location = $(el).find('[class*="location"]').first().text().trim() || 'Lagos'
    const href    = $(el).find('a').first().attr('href') || ''
    const posted  = $(el).find('time, [class*="date"]').first().text().trim() || 'Recently'
    if (!title || !href) return
    const applyUrl = href.startsWith('http') ? href : 'https://www.jobberman.com' + href
    jobs.push({
      jobId: 'jobberman-' + Buffer.from(applyUrl).toString('base64').substring(0, 20),
      title,
      company: company || 'Unknown',
      location,
      applyUrl,
      description: title + ' at ' + company,
      platform: 'Jobberman',
      postedDate: posted,
    })
  })

  console.log('[Jobberman] ' + jobs.length + ' jobs for "' + role + '"')
  return jobs
}

async function scrapeMyJobMag(role: string): Promise<RawJob[]> {
  const url = 'https://www.myjobmag.com/jobs-in/lagos?keyword=' + encodeURIComponent(role) + '&date_posted=7'
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 })
  const $ = cheerio.load(data)
  const jobs: RawJob[] = []

  $('.job-list-item, article.job, [class*="job-item"]').each((_, el) => {
    const title   = $(el).find('h2, h3, .job-title, a.title').first().text().trim()
    const company = $(el).find('[class*="company"]').first().text().trim()
    const location = $(el).find('[class*="location"]').first().text().trim() || 'Lagos'
    const href    = $(el).find('a').first().attr('href') || ''
    const posted  = $(el).find('time, [class*="date"]').first().text().trim() || 'Recently'
    if (!title || !href) return
    const applyUrl = href.startsWith('http') ? href : 'https://www.myjobmag.com' + href
    jobs.push({
      jobId: 'myjobmag-' + Buffer.from(applyUrl).toString('base64').substring(0, 20),
      title,
      company: company || 'Unknown',
      location,
      applyUrl,
      description: title + ' at ' + company,
      platform: 'MyJobMag',
      postedDate: posted,
    })
  })

  console.log('[MyJobMag] ' + jobs.length + ' jobs for "' + role + '"')
  return jobs
}

async function filterAlreadyNotified(jobs: RawJob[]): Promise<RawJob[]> {
  const existing = await prisma.job.findMany({
    where: { jobId: { in: jobs.map(j => j.jobId) } },
    select: { jobId: true },
  })
  const seen = new Set(existing.map((j: any) => j.jobId))
  return jobs.filter((j: RawJob) => !seen.has(j.jobId))
}