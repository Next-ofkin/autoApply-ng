import axios from 'axios'
import { prisma } from '../db/client'

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

PROJECTS
Sisi Igbadun (sisiigbadun.com) - Full-stack e-commerce (Next.js 15 + Supabase + Paystack). Live.
OracleNA - Cloud AI Code Intelligence Platform (Next.js + Fastify + Claude Sonnet + KuzuDB)

EDUCATION
HND Mechanical Engineering - The Polytechnic of Ibadan | 2025`

export { MASTER_CV }

export async function analyzeCvOnce(): Promise<void> {
  const existing = await prisma.cvProfile.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (existing && existing.updatedAt > sevenDaysAgo) {
    console.log('[CV Analyzer] Profile exists and is fresh — skipping analysis')
    return
  }

  console.log('[CV Analyzer] Analyzing CV with Groq — this happens once every 7 days...')

  const prompt = 'You are an expert tech recruiter. Analyze this CV and extract structured data.\n\n'
    + 'CV:\n' + MASTER_CV + '\n\n'
    + 'Return ONLY valid JSON, no markdown:\n'
    + '{'
    + '"skills":["React","Next.js","Node.js","TypeScript","Fastify","PostgreSQL","Supabase","Redis","Docker","Python"],'
    + '"keywords":["full-stack","frontend","backend","developer","engineer","software"],'
    + '"experienceLevel":"mid-level",'
    + '"yearsExperience":3,'
    + '"domains":["fintech","e-commerce","SaaS","web development"],'
    + '"rawAnalysis":"brief summary of candidate strengths"'
    + '}'

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'Authorization': 'Bearer ' + (process.env.GROQ_API_KEY || ''),
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    const text = response.data.choices[0].message.content || ''
    const cleaned = text.replace(/```json|```/g, '').replace(/[\x00-\x1F\x7F]/g, ' ').trim()
    const profile = JSON.parse(cleaned)

    if (existing) {
      await prisma.cvProfile.update({
        where: { id: existing.id },
        data: {
          skills: profile.skills,
          keywords: profile.keywords,
          experienceLevel: profile.experienceLevel,
          yearsExperience: profile.yearsExperience,
          domains: profile.domains,
          rawAnalysis: profile.rawAnalysis,
        },
      })
    } else {
      await prisma.cvProfile.create({
        data: {
          skills: profile.skills,
          keywords: profile.keywords,
          experienceLevel: profile.experienceLevel,
          yearsExperience: profile.yearsExperience,
          domains: profile.domains,
          rawAnalysis: profile.rawAnalysis,
        },
      })
    }
    console.log('[CV Analyzer] Profile saved to DB successfully!')
    console.log('[CV Analyzer] Skills: ' + profile.skills.join(', '))
  } catch (err: any) {
    console.error('[CV Analyzer] Error:', err.response?.data || err.message)
  }
}
