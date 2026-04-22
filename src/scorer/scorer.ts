import { prisma } from '../db/client'

export interface MatchResult {
  score: number
  reasons: string[]
  shouldApply: boolean
}

const HARDCODED_SKILLS = [
  'react', 'next.js', 'nextjs', 'node', 'node.js', 'nodejs',
  'typescript', 'javascript', 'python', 'fastify', 'nestjs',
  'postgresql', 'postgres', 'supabase', 'redis', 'docker',
  'tailwind', 'html', 'css', 'rest', 'api', 'git', 'vercel',
  'railway', 'fullstack', 'full stack', 'full-stack', 'frontend',
  'front-end', 'backend', 'back-end', 'web developer', 'software engineer',
  'software developer', 'engineer', 'developer'
]

const HARDCODED_KEYWORDS = [
  'full-stack', 'full stack', 'fullstack', 'frontend', 'front end',
  'react', 'node', 'javascript', 'typescript', 'python', 'web',
  'software', 'developer', 'engineer', 'remote', 'junior', 'mid',
  'senior', 'intern', 'graduate', 'associate'
]

export async function scoreJobLocally(jobTitle: string, jobDescription: string): Promise<MatchResult> {
  const text = (jobTitle + ' ' + jobDescription).toLowerCase()
  const titleLower = jobTitle.toLowerCase()
  const reasons: string[] = []
  let score = 0

  const skillMatches = HARDCODED_SKILLS.filter((s: string) => text.includes(s.toLowerCase()))
  const skillScore = Math.min(50, skillMatches.length * 5)
  score += skillScore
  if (skillMatches.length > 0) {
    reasons.push('Skills: ' + skillMatches.slice(0, 4).join(', '))
  }

  const keywordMatches = HARDCODED_KEYWORDS.filter((k: string) => titleLower.includes(k.toLowerCase()))
  const keywordScore = Math.min(30, keywordMatches.length * 10)
  score += keywordScore
  if (keywordMatches.length > 0) {
    reasons.push('Title match: ' + keywordMatches.slice(0, 2).join(', '))
  }

  const domainWords = ['fintech', 'finance', 'ecommerce', 'e-commerce', 'saas', 'startup', 'tech', 'ai', 'platform']
  const domainMatches = domainWords.filter((d: string) => text.includes(d))
  if (domainMatches.length > 0) {
    score += 20
    reasons.push('Domain: ' + domainMatches[0])
  }

  const excludeWords = ['manager', 'sales', 'marketing', 'accountant', 'finance manager', 'hr ', 'recruiter', 'designer']
  const isIrrelevant = excludeWords.some((w: string) => titleLower.includes(w))
  if (isIrrelevant) {
    score = Math.min(score, 30)
    reasons.push('Non-tech role filtered')
  }

  score = Math.min(100, Math.max(0, score))

  const minScore = Number(process.env.MIN_MATCH_SCORE) || 55
  console.log('[Scorer] ' + score + '% — ' + jobTitle)

  return {
    score,
    reasons,
    shouldApply: score >= minScore,
  }
}
