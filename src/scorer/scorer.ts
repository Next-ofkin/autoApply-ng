import { prisma } from '../db/client'

export interface MatchResult {
  score: number
  reasons: string[]
  shouldApply: boolean
}

const MY_SKILLS = ['react', 'next', 'node', 'typescript', 'javascript', 'python',
  'fastify', 'nestjs', 'postgres', 'supabase', 'redis', 'docker', 'tailwind',
  'html', 'css', 'api', 'git', 'vercel', 'fullstack', 'full-stack', 'full stack']

const GOOD_TITLES = ['full stack', 'fullstack', 'full-stack', 'frontend', 'front end',
  'front-end', 'react', 'node', 'javascript', 'typescript', 'python', 'software engineer',
  'software developer', 'web developer', 'backend', 'back end']

const BAD_TITLES = ['manager', 'sales', 'marketing', 'accountant', 'hr ', 'recruiter',
  'designer', 'devops', 'data scientist', 'mobile', 'ios', 'android', 'java developer',
  'php developer', '.net developer', 'ruby', 'c++ ', 'c# ']

export async function scoreJobLocally(jobTitle: string, jobDescription: string): Promise<MatchResult> {
  const titleLower = jobTitle.toLowerCase()
  const descLower = jobDescription.toLowerCase()
  const fullText = titleLower + ' ' + descLower
  const reasons: string[] = []
  let score = 0

  const isBadTitle = BAD_TITLES.some(w => titleLower.includes(w))
  if (isBadTitle) {
    console.log('[Scorer] 0% (filtered) — ' + jobTitle)
    return { score: 0, reasons: ['Non-relevant role'], shouldApply: false }
  }

  const titleMatches = GOOD_TITLES.filter(t => titleLower.includes(t))
  if (titleMatches.length > 0) {
    score += 40
    reasons.push('Title: ' + titleMatches.slice(0, 2).join(', '))
  }

  const skillMatches = MY_SKILLS.filter(s => fullText.includes(s))
  const skillScore = Math.min(40, skillMatches.length * 8)
  score += skillScore
  if (skillMatches.length > 0) {
    reasons.push('Skills: ' + skillMatches.slice(0, 3).join(', '))
  }

  if (fullText.includes('remote')) {
    score += 10
    reasons.push('Remote position')
  }

  if (titleLower.includes('senior') || titleLower.includes('lead')) score -= 10
  if (titleLower.includes('junior') || titleLower.includes('intern') || titleLower.includes('graduate') || titleLower.includes('fresher')) score += 5

  score = Math.min(100, Math.max(0, score))
  const minScore = Number(process.env.MIN_MATCH_SCORE) || 55
  console.log('[Scorer] ' + score + '% — ' + jobTitle)

  return { score, reasons, shouldApply: score >= minScore }
}
