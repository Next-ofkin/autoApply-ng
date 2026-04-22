import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { MASTER_CV } from '../cv-analyzer/analyzer'

export interface TailoredOutput {
  cv: string
  coverLetter: string
}

export async function tailorCVForJob(jobTitle: string, company: string, jobDescription: string): Promise<TailoredOutput> {
  console.log('[CV Tailor] Tailoring for: ' + jobTitle + ' at ' + company)

  const prompt = 'You are an expert CV writer.\n\n'
    + 'MASTER CV:\n' + MASTER_CV + '\n\n'
    + 'JOB TITLE: ' + jobTitle + '\n'
    + 'COMPANY: ' + company + '\n'
    + 'JOB DESCRIPTION: ' + jobDescription.substring(0, 400) + '\n\n'
    + 'Rewrite the CV to emphasize the most relevant skills for this role.\n'
    + 'Write a 150-word cover letter addressed to ' + company + '.\n\n'
    + 'Return ONLY valid JSON, no markdown:\n'
    + '{"cv":"tailored cv text","coverLetter":"cover letter text"}'

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
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
}
