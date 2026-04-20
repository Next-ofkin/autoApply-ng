import axios from 'axios'

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
    console.error('[Telegram] Failed:', err.response?.data || err.message)
  }
}

export async function sendJobAlert(params: {
  jobTitle: string
  company: string
  location: string
  platform: string
  applyUrl: string
  postedDate: string
}): Promise<void> {
  const { jobTitle, company, location, platform, applyUrl, postedDate } = params
  const message = '<b>New Job Found!</b>\n\n'
    + '<b>Role:</b> ' + jobTitle + '\n'
    + '<b>Company:</b> ' + company + '\n'
    + '<b>Location:</b> ' + location + '\n'
    + '<b>Platform:</b> ' + platform + '\n'
    + '<b>Posted:</b> ' + postedDate + '\n\n'
    + '<a href="' + applyUrl + '">Apply Here</a>\n\n'
    + '<i>autoApply-ng Lagos Job Bot</i>'
  await sendMessage(message)
}

export async function sendDailySummary(stats: {
  found: number
  platforms: string[]
}): Promise<void> {
  const message = '<b>Daily Job Summary</b>\n\n'
    + '<b>New jobs found today:</b> ' + stats.found + '\n'
    + '<b>Platforms searched:</b> ' + stats.platforms.join(', ') + '\n\n'
    + '<i>Check above messages for apply links</i>'
  await sendMessage(message)
}
