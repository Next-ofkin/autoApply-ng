import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

export async function generatePDF(cvText: string, jobId: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'assets', 'pdfs')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, jobId + '-cv.pdf')

  const lines = cvText.split('\n').filter((l: string) => l.trim())
  let html = '<html><head><style>'
  html += 'body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;margin:0;padding:32px}'
  html += 'h1{font-size:20px;font-weight:bold;margin:0 0 4px}'
  html += 'h2{font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1a1a1a;padding-bottom:4px;margin:18px 0 8px}'
  html += 'p{margin:3px 0;line-height:1.55}'
  html += '.contact{font-size:11px;color:#555;margin-bottom:8px}'
  html += '.bullet{margin-left:14px}'
  html += '</style></head><body>'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('EXCEL') || trimmed.startsWith('Excel')) {
      html += '<h1>' + escapeHtml(trimmed) + '</h1>'
    } else if (trimmed.includes('@') || trimmed.includes('+234') || trimmed.includes('linkedin') || trimmed.includes('github')) {
      html += '<p class="contact">' + escapeHtml(trimmed) + '</p>'
    } else if (trimmed.match(/^[A-Z][A-Z\s&]+$/) && trimmed.length < 40) {
      html += '<h2>' + escapeHtml(trimmed) + '</h2>'
    } else if (trimmed.startsWith('*') || trimmed.startsWith('-') || trimmed.startsWith('•')) {
      html += '<p class="bullet">' + escapeHtml(trimmed) + '</p>'
    } else {
      html += '<p>' + escapeHtml(trimmed) + '</p>'
    }
  }
  html += '</body></html>'

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
      printBackground: true,
    })
    console.log('[PDF Generator] Generated: ' + outputPath)
    return outputPath
  } finally {
    await browser.close()
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
