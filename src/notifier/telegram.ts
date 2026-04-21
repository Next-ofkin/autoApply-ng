import axios from 'axios'
import * as fs from 'fs'
const FormData = require('form-data')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const BASE_URL = 'https://api.telegram.org/bot' + BOT_TOKEN

async function sendMessage(text: string): Promise<void> {
  try {
    await axios.post(BASE_URL + '/sendMessage', {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    })
    console.log('[Telegram] Message sent successfully')
  } catch (err: any) {
    console.error('[Telegram] Message failed:', err.response?.data || err.message)
  }
}

export async function sendPDF(pdfPath: string, caption: string): Promise<void> {
  try {
    if (!fs.existsSync(pdfPath)) { console.error('[Telegram] PDF not found:', pdfPath); return }
    const form = new FormData()
    form.append('chat_id', CHAT_ID)
    form.append('caption', caption)
    form.append('document', fs.createReadStream(pdfPath), { filename: 'tailored-cv.pdf', contentType: 'application/pdf' })
    await axios.post(BASE_URL + '/sendDocument', form, { headers: form.getHeaders(), timeout: 30000 })
    console.log('[Telegram] PDF sent successfully')
  } catch (err: any) {
    console.error('[Telegram] PDF send failed:', err.response?.data || err.message)
  }
}

export async function sendJobAlert(params: {
  jobTitle: string; company: string; location: string
  platform: string; applyUrl: string; postedDate: string
  matchScore?: number; matchReasons?: string
}): Promise<void> {
  const { jobTitle, company, location, platform, applyUrl, postedDate, matchScore, matchReasons } = params
  const label = matchScore && matchScore >= 90 ? 'EXCELLENT MATCH' : matchScore && matchScore >= 80 ? 'STRONG MATCH' : 'GOOD MATCH'
  const message = '<b>New Job Match Found!</b>\n\n'
    + (matchScore ? '<b>' + matchScore + '% - ' + label + '</b>\n' : '')
    + (matchReasons ? '<i>' + matchReasons + '</i>\n\n' : '\n')
    + '<b>Role:</b> ' + jobTitle + '\n'
    + '<b>Company:</b> ' + company + '\n'
    + '<b>Location:</b> ' + location + '\n'
    + '<b>Platform:</b> ' + platform + '\n'
    + '<b>Posted:</b> ' + postedDate + '\n\n'
    + '<a href="' + applyUrl + '">Apply Here</a>\n\n'
    + '<i>Tailored CV attached below</i>'
  await sendMessage(message)
}

export async function sendDailySummary(stats: { found: number; platforms: string[] }): Promise<void> {
  const message = '<b>Daily Job Summary</b>\n\n'
    + '<b>Matched jobs today:</b> ' + stats.found + '\n'
    + '<b>Platforms:</b> ' + stats.platforms.join(', ') + '\n\n'
    + '<i>Only 72%+ matches sent</i>'
  await sendMessage(message)
}
