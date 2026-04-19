import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.ZEPTO_SMTP_HOST || 'smtp.zeptomail.com',
  port: Number(process.env.ZEPTO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.ZEPTO_SMTP_USER || 'emailapikey',
    pass: process.env.ZEPTO_SMTP_PASS || '',
  },
})

export async function sendApplicationEmail(params: {
  jobTitle: string; company: string; location: string
  applyUrl: string; success: boolean; error?: string
}): Promise<void> {
  const { jobTitle, company, location, applyUrl, success, error } = params
  const subject = success ? `✅ Applied: ${jobTitle} at ${company}` : `❌ Failed: ${jobTitle} at ${company}`
  const html = success
    ? `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#166534">Applied Successfully ✅</h2><p><b>Role:</b> ${jobTitle}</p><p><b>Company:</b> ${company}</p><p><b>Location:</b> ${location}</p><p><b>Time:</b> ${new Date().toLocaleString('en-NG',{timeZone:'Africa/Lagos'})}</p><a href="${applyUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View Job →</a></div>`
    : `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#991b1b">Application Failed ❌</h2><p><b>Role:</b> ${jobTitle}</p><p><b>Company:</b> ${company}</p><p><b>Error:</b> ${error}</p><a href="${applyUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Apply Manually →</a></div>`
  try {
    await transporter.sendMail({
      from: `"autoApply-ng" <${process.env.NOTIFY_FROM_EMAIL}>`,
      to: process.env.NOTIFY_TO_EMAIL,
      subject, html,
    })
    console.log(`[Notifier] Email sent: ${subject}`)
  } catch (err: any) {
    console.error('[Notifier] Email failed:', err.message)
  }
}

export async function sendDailySummaryEmail(stats: { applied: number; failed: number; total: number }): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"autoApply-ng" <${process.env.NOTIFY_FROM_EMAIL}>`,
      to: process.env.NOTIFY_TO_EMAIL,
      subject: `📊 Daily Summary — ${stats.applied} applications sent`,
      html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>Daily Summary</h2><p>Applied: <b>${stats.applied}</b></p><p>Failed: <b>${stats.failed}</b></p><p>Total found: <b>${stats.total}</b></p></div>`,
    })
  } catch (err: any) {
    console.error('[Notifier] Summary email failed:', err.message)
  }
}