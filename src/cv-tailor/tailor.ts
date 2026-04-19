import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MASTER_CV = `
EXCEL L. SHOGBOLA — Full Stack Developer
Victoria Island, Lagos | +234 904 765 2531 | excelshogbola@gmail.com
GitHub: github.com/Next-ofkin | LinkedIn: linkedin.com/in/excel-shogbola-710ba0244

PROFESSIONAL SUMMARY
Full Stack Software Developer with production experience building enterprise-grade web applications.
Proven ability to architect scalable systems using Next.js, React.js, Supabase, and AI-driven tooling.
Currently Lead Developer at NOLT Finance — designed and shipped an internal operations system
that reduced manual processing time by 30%.

TECHNICAL SKILLS
Frontend: Next.js 15, React.js, Tailwind CSS, shadcn/ui, HTML5
Backend: Node.js, Fastify, NestJS, Python, RESTful APIs
Databases: PostgreSQL, Supabase, Firebase, Redis
Tools: Git/GitHub, Docker, Railway, Vercel, BullMQ, Cron Jobs
AI: Claude Sonnet API, AI Prompt Engineering, Playwright Automation
Certifications: IT Support, Cybersecurity Fundamentals, Microsoft Excel (Expert)

EXPERIENCE
Lead Software Developer — NOLT Finance | 2024–Present
- Architected proprietary Enterprise Operations System managing company workflows
- Automated verification processes reducing manual processing time by 30%
- Built automated email systems and digital certificate generation pipelines

Data Analyst & Digital Manager — RCCG Throne of Mercy | 1 Year
- Implemented data-driven campaigns increasing online engagement by 50%

Digital Marketing Strategist — Yessboss Clothing | 2 Years
- Developed strategies increasing online sales by 40%

PROJECTS
Sisi Igbadun (sisiigbadun.com) — Full-stack e-commerce (Next.js 15 + Supabase + Paystack). Live in production.
OracleNA — Cloud AI Code Intelligence Platform (Next.js + Fastify + Claude Sonnet + KuzuDB)
Ask Taiwo — AI Tax Chatbot using Claude API for 2026 Nigerian tax law

EDUCATION
HND Mechanical Engineering — The Polytechnic of Ibadan | 2025
`

export interface TailoredOutput {
  cv: string
  coverLetter: string
}

export async function tailorCVForJob(jobTitle: string, company: string, jobDescription: string): Promise<TailoredOutput> {
  console.log(`[CV Tailor] Tailoring for: ${jobTitle} at ${company}`)
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert Nigerian tech recruiter and CV writer.

MASTER CV:
${MASTER_CV}

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription}

Rewrite the CV to emphasize the most relevant skills for this specific role.
Also write a 250-word cover letter addressed to ${company}.

Return ONLY valid JSON, no markdown, no explanation:
{"cv":"full tailored cv text here","coverLetter":"full cover letter here"}`
    }],
  })

  const text = message.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { cv: MASTER_CV, coverLetter: `Dear Hiring Manager,\n\nI am applying for ${jobTitle} at ${company}.\n\nBest regards,\nExcel Shogbola` }
  }
}

export function saveTailoredOutput(jobId: string, output: TailoredOutput) {
  const dir = path.join(process.cwd(), 'assets', 'tailored', jobId)
  fs.mkdirSync(dir, { recursive: true })
  const cvPath = path.join(dir, 'cv.txt')
  const coverLetterPath = path.join(dir, 'cover-letter.txt')
  fs.writeFileSync(cvPath, output.cv)
  fs.writeFileSync(coverLetterPath, output.coverLetter)
  return { cvPath, coverLetterPath }
}