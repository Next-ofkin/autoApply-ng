import axios from 'axios'

const ZEPTO_API_URL = 'https://api.zeptomail.com/v1.1/email'
const ZEPTO_TOKEN = process.env.ZEPTO_SMTP_PASS || ''
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'noreply@stringsautomation.com'
const TO_EMAIL = process.env.NOTIFY_TO_EMAIL || 'excelshogbola@gmail.com'

async function sendEmail(subject: string, html: string): Promise<void> {
  try {
    await axios.post(ZEPTO_API_URL, {
      from: { address: FROM_EMAIL, name: 'autoApply-ng' },
      to: [{ email_address: { address: TO_EMAIL, name: 'Excel Shogbola' } }],
      subject,
      htmlbody: html,
    }, {
      headers: {
        'Authorization': ZEPTO_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    console.log(`[Notifier] Email sent: ${subject}`)
  } catch (err: any) {
    console.error('[Notifier] Email failed:', err.response?.data || err.message)
  }
}

export async function sendApplicationEmail(params: {
  jobTitle: string; company: string; location: string
  applyUrl: string; success: boolean; error?: string
}): Promise<void> {
  const { jobTitle, company, location, applyUrl, success, error } = params
  const subject = success
    ? `✅ Applied: ${jobTitle} at ${company}`
    : `❌ Failed: ${jobTitle} at ${company}`
  const html = success
    ? `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#166534">Applied Successfully ✅</h2><p><b>Role:</b> ${jobTitle}</p><p><b>Company:</b> ${company}</p><p><b>Location:</b> ${location}</p><p><b>Time:</b> ${new Date().toLocaleString('en-NG',{timeZone:'Africa/Lagos'})}</p><a href="${applyUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px">View Job →</a></div>`
    : `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#991b1b">Application Failed ❌</h2><p><b>Role:</b> ${jobTitle}</p><p><b>Company:</b> ${company}</p><p><b>Error:</b> ${error}</p><a href="${applyUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px">Apply Manually →</a></div>`
  await sendEmail(subject, html)
}

export async function sendDailySummaryEmail(stats: { applied: number; failed: number; total: number }): Promise<void> {
  await sendEmail(
    `📊 Daily Summary — ${stats.applied} applications sent`,
    `<div style="font-family:Arial,sans-serif;padding:24px"><h2>Daily Summary</h2><p>Applied: <b>${stats.applied}</b></p><p>Failed: <b>${stats.failed}</b></p><p>Total found: <b>${stats.total}</b></p></div>`
  )
}