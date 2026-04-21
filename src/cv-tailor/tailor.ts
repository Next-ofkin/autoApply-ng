import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

const MASTER_CV = `EXCEL L. SHOGBOLA - Full Stack Developer
Victoria Island, Lagos | +234 904 765 2531 | excelshogbola@gmail.com
GitHub: github.com/Next-ofkin | LinkedIn: linkedin.com/in/excel-shogbola-710ba0244

PROFESSIONAL SUMMARY
Full Stack Software Developer with production experience building enterprise-grade web applications.
Proven ability to architect scalable systems using Next.js, React.js, Supabase, and AI-driven tooling.
Currently Lead Developer at NOLT Finance - designed and shipped an internal operations system
that reduced manual processing time by 30%.

TECHNICAL SKILLS
Frontend: Next.js 15, React.js, Tailwind CSS, shadcn/ui, HTML5
Backend: Node.js, Fastify, NestJS, Python, RESTful APIs
Databases: PostgreSQL, Supabase, Firebase, Redis
Tools: Git/GitHub, Docker, Railway, Vercel, BullMQ, Cron Jobs
AI: Claude Sonnet API, AI Prompt Engineering, Playwright Automation
Certifications: IT Support, Cybersecurity Fundamentals, Microsoft Excel (Expert)

EXPERIENCE
Lead Software Developer - NOLT Finance | 2024-Present
- Architected proprietary Enterprise Operations System managing company workflows
- Automated verification processes reducing manual processing time by 30%
- Built automated email systems and digital certificate generation pipelines

Data Analyst and Digital Manager - RCCG Throne of Mercy | 1 Year
- Implemented data-driven campaigns increasing online engagement by 50%

Digital Marketing Strategist - Yessboss Clothing | 2 Years
- Developed strategies increasing online sales by 40%

PROJECTS
Sisi Igbadun (sisiigbadun.com) - Full-stack e-commerce (Next.js 15 + Supabase + Paystack). Live.
OracleNA - Cloud AI Code Intelligence Platform (Next.js + Fastify + Claude Sonnet + KuzuDB)
Ask Taiwo - AI Tax Chatbot using Claude API for 2026 Nigerian tax law

EDUCATION
HND Mechanical Engineering - The Polytechnic of Ibadan | 2025`

export interface TailoredOutput {
  cv: string
  coverLetter: string
}

export interface MatchResult {
  score: number
  reasons: string[]
  shouldApply: boolean
}

async function callGroq(prompt: string): Promise<string> {
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: {
      'Authorization': 'Bearer ' + (process.env.GROQ_API_KEY || ''),
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  })
  return response.data.choices[0].message.content || ''
}

export async function scoreJobMatch(jobTitle: string, company: string, jobDescription: string): Promise<MatchResult> {
  console.log('[CV Matcher] Scoring: ' + jobTitle + ' at ' + company)
  const prompt = 'You are an expert tech recruiter.\n\n'
    + 'Analyze how well this candidate CV matches this job description.\n\n'
    + 'CV:\n' + MASTER_CV + '\n\n'
    + 'JOB TITLE: ' + jobTitle + '\n'
    + 'COMPANY: ' + company + '\n'
    + 'JOB DESCRIPTION: ' + jobDescription.substring(0, 400) + '\n\n'
    + 'Score the match from 0-100 based on:\n'
    + '- Required skills match (40 points)\n'
    + '- Experience level match (30 points)\n'
    + '- Domain/industry relevance (20 points)\n'
    + '- Education requirements (10 points)\n\n'
    + 'Return ONLY valid JSON, no markdown:\n'
    + '{"score":75,"reasons":["Strong React match","Missing TypeScript requirement"],"shouldApply":true}\n\n'
    + 'shouldApply must be true only if score >= 72'
  try {
    const text = await callGroq(prompt)
    const cleaned = text.replace(/```json|```/g, "").replace(/[\x00-\x1F\x7F]/g, " ").trim()
    const result = JSON.parse(cleaned)
    console.log('[CV Matcher] Score: ' + result.score + '% for ' + jobTitle)
    return result
  } catch (err: any) {
    console.error('[CV Matcher] Error:', err.message)
    return { score: 75, reasons: ['Could not score - sending anyway'], shouldApply: true }
  }
}

export async function tailorCVForJob(jobTitle: string, company: string, jobDescription: string): Promise<TailoredOutput> {
  console.log('[CV Tailor] Tailoring for: ' + jobTitle + ' at ' + company)
  const prompt = 'You are an expert CV writer and recruiter.\n\n'
    + 'MASTER CV:\n' + MASTER_CV + '\n\n'
    + 'JOB TITLE: ' + jobTitle + '\n'
    + 'COMPANY: ' + company + '\n'
    + 'JOB DESCRIPTION: ' + jobDescription.substring(0, 400) + '\n\n'
    + 'Rewrite the CV to emphasize the most relevant skills for this specific role.\n'
    + 'Also write a 200-word cover letter addressed to ' + company + '.\n\n'
    + 'Return ONLY valid JSON, no markdown:\n'
    + '{"cv":"full tailored cv text here","coverLetter":"full cover letter here"}'
  try {
    const text = await callGroq(prompt)
    const cleaned = text.replace(/```json|```/g, "").replace(/[\x00-\x1F\x7F]/g, " ").trim()
    return JSON.parse(cleaned)
  } catch (err: any) {
    console.error('[CV Tailor] Error:', err.response?.data || err.message)
    return {
      cv: MASTER_CV,
      coverLetter: 'Dear Hiring Manager,\n\nI am excited to apply for the ' + jobTitle + ' role at ' + company + '.\n\nBest regards,\nExcel Shogbola',
    }
  }
}

export function saveTailoredOutput(jobId: string, output: TailoredOutput) {
  const dir = path.join(process.cwd(), 'assets', 'tailored', jobId)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'cv.txt'), output.cv)
  fs.writeFileSync(path.join(dir, 'cover-letter.txt'), output.coverLetter)
  return { cvPath: path.join(dir, 'cv.txt'), coverLetterPath: path.join(dir, 'cover-letter.txt') }
}

