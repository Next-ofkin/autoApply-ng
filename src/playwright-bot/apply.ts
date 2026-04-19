import { chromium, Browser, Page } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

export interface ApplyResult {
  success: boolean
  error?: string
}

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browser
}

function loadCookies(): any[] {
  try {
    const raw = process.env.INDEED_COOKIES || '[]'
    const parsed = JSON.parse(raw)
    const cookies = Array.isArray(parsed) ? parsed : (parsed.value || [])
    return cookies.map((c: any) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.expirationDate || -1,
      httpOnly: c.httpOnly || false,
      secure: c.secure || false,
      sameSite: normalizeSameSite(c.sameSite),
    }))
  } catch (err) {
    console.error('[Playwright] Failed to parse INDEED_COOKIES:', err)
    return []
  }
}

function normalizeSameSite(val: string): 'Strict' | 'Lax' | 'None' {
  if (!val) return 'None'
  if (val.toLowerCase() === 'strict') return 'Strict'
  if (val.toLowerCase() === 'lax') return 'Lax'
  return 'None'
}

export async function applyToJob(
  applyUrl: string,
  pdfPath: string,
  coverLetter: string,
  jobTitle: string,
  company: string
): Promise<ApplyResult> {
  console.log(`[Playwright] Applying to: ${jobTitle} at ${company}`)
  const b = await getBrowser()
  const context = await b.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })

  try {
    const cookies = loadCookies()
    if (cookies.length === 0) {
      return { success: false, error: 'No Indeed cookies found in INDEED_COOKIES env var' }
    }

    await context.addCookies(cookies)
    console.log(`[Playwright] Loaded ${cookies.length} cookies — skipping login`)

    const page = await context.newPage()
    await page.goto('https://ng.indeed.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const isLoggedIn = await page.$('[data-testid="header-jobseeker-signin"], [aria-label="My Account"]')
    if (!isLoggedIn) {
      console.log('[Playwright] Warning: may not be logged in — continuing anyway')
    } else {
      console.log('[Playwright] Confirmed logged in via cookies')
    }

    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const applied = await handleApplicationFlow(page, pdfPath, coverLetter)

    if (applied) {
      console.log(`[Playwright] Successfully applied to ${jobTitle} at ${company}`)
      return { success: true }
    } else {
      return { success: false, error: 'Could not locate apply button or form' }
    }
  } catch (err: any) {
    console.error(`[Playwright] Failed applying to ${jobTitle}:`, err.message)
    return { success: false, error: err.message }
  } finally {
    await context.close()
  }
}

async function handleApplicationFlow(
  page: Page,
  pdfPath: string,
  coverLetter: string
): Promise<boolean> {
  const applyButtonSelectors = [
    '[data-testid="apply-button"]',
    '.jobsearch-IndeedApplyButton',
    'button[data-indeed-apply-token]',
    'a[data-indeed-apply-token]',
    'button:has-text("Apply now")',
    'button:has-text("Apply")',
  ]

  let clicked = false
  for (const selector of applyButtonSelectors) {
    const btn = await page.$(selector)
    if (btn) {
      await btn.click()
      clicked = true
      console.log(`[Playwright] Clicked apply button: ${selector}`)
      break
    }
  }

  if (!clicked) return false
  await page.waitForTimeout(3000)

  await fillApplicationForm(page, pdfPath, coverLetter)
  return true
}

async function fillApplicationForm(
  page: Page,
  pdfPath: string,
  coverLetter: string
): Promise<void> {
  const absolutePdfPath = path.resolve(pdfPath)

  const resumeUpload = await page.$(
    'input[type="file"][accept*="pdf"], input[type="file"]'
  )
  if (resumeUpload) {
    await resumeUpload.setInputFiles(absolutePdfPath)
    console.log('[Playwright] Uploaded resume PDF')
    await page.waitForTimeout(2000)
  }

  const coverLetterArea = await page.$(
    'textarea[name*="cover"], textarea[placeholder*="cover"], textarea'
  )
  if (coverLetterArea) {
    await coverLetterArea.fill(coverLetter.substring(0, 3000))
    console.log('[Playwright] Filled cover letter')
  }

  await page.waitForTimeout(1000)

  const continueButtons = [
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'button:has-text("Submit")',
    'button:has-text("Submit application")',
    '[data-testid="submit-button"]',
  ]

  for (let step = 0; step < 8; step++) {
    let advanced = false
    for (const selector of continueButtons) {
      const btn = await page.$(selector)
      if (btn) {
        const isVisible = await btn.isVisible()
        if (isVisible) {
          const text = await btn.innerText()
          console.log(`[Playwright] Step ${step + 1}: clicking "${text}"`)
          await btn.click()
          await page.waitForTimeout(2500)
          advanced = true
          if (text.toLowerCase().includes('submit')) {
            console.log('[Playwright] Application submitted!')
            return
          }
          break
        }
      }
    }
    if (!advanced) break
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}