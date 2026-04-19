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
}

const TARGET_ROLES = (process.env.TARGET_ROLES || 'Full Stack Developer,Frontend Developer,IT Support')
  .split(',').map(r => r.trim())

const LOCATION = process.env.TARGET_LOCATION || 'Lagos, Nigeria'

export async function searchIndeedJobs(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []
  for (const role of TARGET_ROLES) {
    console.log(`[Searcher] Searching: "${role}"`)
    try {
      const jobs = await scrapeIndeed(role)
      allJobs.push(...jobs)
    } catch (err: any) {
      console.error(`[Searcher] Failed for "${role}":`, err.message)
    }
  }
  return filterAlreadyApplied(allJobs)
}

async function scrapeIndeed(role: string): Promise<RawJob[]> {
  const url = `https://ng.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(LOCATION)}&sort=date`
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' },
    timeout: 15000,
  })
  const $ = cheerio.load(data)
  const jobs: RawJob[] = []
  $('[data-jk]').each((_, el) => {
    const jobId   = $(el).attr('data-jk') || ''
    const title   = $(el).find('[data-testid="jobTitle"]').text().trim() || $(el).find('.jobTitle').text().trim()
    const company = $(el).find('[data-testid="company-name"]').text().trim() || $(el).find('.companyName').text().trim()
    const location = $(el).find('[data-testid="text-location"]').text().trim() || LOCATION
    if (!jobId || !title) return
    jobs.push({ jobId, title, company, location, applyUrl: `https://ng.indeed.com/viewjob?jk=${jobId}`, description: `${title} at ${company}` })
  })
  console.log(`[Searcher] Found ${jobs.length} jobs for "${role}"`)
  return jobs
}

async function filterAlreadyApplied(jobs: RawJob[]): Promise<RawJob[]> {
  const existing = await prisma.job.findMany({
    where: { jobId: { in: jobs.map(j => j.jobId) } },
    select: { jobId: true },
  })
  const seen = new Set(existing.map(j => j.jobId))
  const fresh = jobs.filter(j => !seen.has(j.jobId))
  console.log(`[Searcher] ${fresh.length} new jobs after dedup`)
  return fresh
}