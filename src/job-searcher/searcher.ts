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
  console.log('[Searcher] Using hardcoded job list — Indeed API mode')
  const jobs: RawJob[] = [
    {
      jobId: 'aa4zlxvymwxm',
      title: 'Full-Stack Software Developer (Web, Mobile & AI)',
      company: 'Eny Consulting Inc',
      location: 'Oshodi, Lagos',
      applyUrl: 'https://to.indeed.com/aa4zlxvymwxm',
      description: 'Full stack developer needed with React, Node.js, and AI integration experience. Build and maintain web applications for consulting clients.'
    },
    {
      jobId: 'aa7s8wcbqy7n',
      title: 'Junior Software Developer',
      company: 'BeeEx Human Resources Consulting',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aa7s8wcbqy7n',
      description: 'Junior developer role. Responsibilities include frontend development, bug fixing, and working with senior developers on web projects.'
    },
    {
      jobId: 'aa8vbp2fyn8p',
      title: 'Frontend Developer',
      company: 'Enterprise Life Nigeria',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aa8vbp2fyn8p',
      description: 'Frontend developer with React.js experience needed for insurance technology platform. Build user interfaces and integrate with REST APIs.'
    },
    {
      jobId: 'aa497bctng77',
      title: 'Full Stack Developer',
      company: 'Packetclouds Technology',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aa497bctng77',
      description: 'Full stack developer for cloud technology company. Work with React, Node.js, and cloud infrastructure.'
    },
    {
      jobId: 'aag9xb6g8yhl',
      title: 'Full Stack Software Developer (MERN) Remote',
      company: 'Terapage',
      location: 'Lagos (Remote)',
      applyUrl: 'https://to.indeed.com/aag9xb6g8yhl',
      description: 'Remote MERN stack developer. MongoDB, Express, React, Node.js. Build scalable web applications.'
    },
    {
      jobId: 'aaddhdwj8zzf',
      title: 'Web Developer (Frontend React)',
      company: 'Fortran House',
      location: 'Epe, Lagos',
      applyUrl: 'https://to.indeed.com/aaddhdwj8zzf',
      description: 'React frontend developer needed. Build responsive web interfaces and work with REST APIs.'
    },
    {
      jobId: 'aas2bqwyd9ds',
      title: 'Data Analyst',
      company: 'Streamsoft Innovative Limited',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aas2bqwyd9ds',
      description: 'Data analyst role. Excel, data interpretation, Google Analytics, reporting and insights.'
    },
    {
      jobId: 'aazysmmtkjrn',
      title: 'IT Support Officer',
      company: 'TeamAce',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aazysmmtkjrn',
      description: 'IT support officer. Provide technical support, troubleshoot hardware and software issues.'
    },
    {
      jobId: 'aajk4rtdkhd7',
      title: 'Full Stack Software Developer',
      company: 'Elonatech Nigeria Limited',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aajk4rtdkhd7',
      description: 'Full stack developer for Nigerian tech company. React, Node.js, database management.'
    },
    {
      jobId: 'aawgscvvnmzx',
      title: 'FullStack Developer',
      company: 'Gurugeeks Royalty Limited',
      location: 'Lagos',
      applyUrl: 'https://to.indeed.com/aawgscvvnmzx',
      description: 'Full stack contract developer. Frontend and backend development for various client projects.'
    },
  ]

  return filterAlreadyApplied(jobs)
}

async function filterAlreadyApplied(jobs: RawJob[]): Promise<RawJob[]> {
  const existing = await prisma.job.findMany({
    where: {
      jobId: { in: jobs.map(j => j.jobId) },
      status: 'APPLIED'
    },
    select: { jobId: true },
  })  const seen = new Set(existing.map(j => j.jobId))
  const fresh = jobs.filter(j => !seen.has(j.jobId))
  console.log(`[Searcher] ${fresh.length} new jobs after dedup (${jobs.length - fresh.length} already applied)`)
  return fresh
}