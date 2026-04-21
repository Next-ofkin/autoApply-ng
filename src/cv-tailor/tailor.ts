import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'

const MASTER_CV = `
EXCEL L. SHOGBOLA - Full Stack Developer
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
HND Mechanical Engineering - The Polytechnic of Ibadan | 2025
`

export interface TailoredOutput {
  cv: string
  coverLetter: string
}

export async function tailorCVForJob(jobTitle: string, company: string, jobDescription: string): Promise<TailoredOutput> {
  console.log('[CV Tailor] Tailoring for: ' + jobTitle + ' at ' + company)

  const prompt = 'You are an expert CV writer and recruiter.\n\n'
    + 'MASTER CV:\n' + MASTER_CV + '\n\n'
    + 'JOB TITLE: ' + jobTitle + '\n'
    + 'COMPANY: ' + company + '\n'
    + 'JOB DESCRIPTION: ' + jobDescription.substring(0, 1000) + '\n\n'
    + 'Rewrite the CV to emphasize the most relevant skills for this specific role.\n'
    + 'Also write a 200-word cover letter addressed to ' + company + '.\n\n'
    + 'Return ONLY valid JSON, no markdown, no explanation:\n'
    + '{"cv":"full tailored cv text here","coverLetter":"full cover letter here"}'

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'Authorization': 'Bearer ' + (process.env.OPENROUTER_API_KEY || ''),
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://autoapply-ng.railway.app',
        'X-Title': 'autoApply-ng',
      },
      timeout: 30000,
    })

    const text = response.data.choices[0].message.content || ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    try {
      return JSON.parse(cleaned)
    } catch {
      return {
        cv: MASTER_CV,
        coverLetter: 'Dear Hiring Manager,\n\nI am excited to apply for the ' + jobTitle + ' role at ' + company + '.\n\nBest regards,\nExcel Shogbola',
      }
    }
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
  const cvPath = path.join(dir, 'cv.txt')
  const coverLetterPath = path.join(dir, 'cover-letter.txt')
  fs.writeFileSync(cvPath, output.cv)
  fs.writeFileSync(coverLetterPath, output.coverLetter)
  return { cvPath, coverLetterPath }
}
