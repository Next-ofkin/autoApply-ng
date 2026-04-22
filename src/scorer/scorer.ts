import { prisma } from '../db/client'

export interface MatchResult {
  score: number
  reasons: string[]
  shouldApply: boolean
}

export async function scoreJobLocally(jobTitle: string, jobDescription: string): Promise<MatchResult> {
  const profile = await prisma.cvProfile.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!profile) {
    return { score: 75, reasons: ['No profile yet - sending anyway'], shouldApply: true }
  }

  const text = (jobTitle + ' ' + jobDescription).toLowerCase()
  const reasons: string[] = []
  let score = 0

  const skillMatches = profile.skills.filter((s: string) => text.includes(s.toLowerCase()))
  const skillScore = Math.min(40, Math.round((skillMatches.length / Math.max(profile.skills.length, 1)) * 40 * 2))
  score += skillScore
  if (skillMatches.length > 0) reasons.push('Skills match: ' + skillMatches.slice(0, 3).join(', '))

  const keywordMatches = profile.keywords.filter((k: string) => text.includes(k.toLowerCase()))
  const keywordScore = Math.min(30, keywordMatches.length * 10)
  score += keywordScore
  if (keywordMatches.length > 0) reasons.push('Keywords: ' + keywordMatches.slice(0, 2).join(', '))

  const domainMatches = profile.domains.filter((d: string) => text.includes(d.toLowerCase()))
  if (domainMatches.length > 0) {
    score += 20
    reasons.push('Domain: ' + domainMatches[0])
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
