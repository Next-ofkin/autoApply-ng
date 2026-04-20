# autoApply-ng 🤖

> **Automated Job Discovery & AI-Powered CV Tailoring Bot**
> Built by Excel L. Shogbola — Lagos, Nigeria

autoApply-ng is a fully automated job alert system that searches multiple global job platforms every 6 hours, uses Claude AI to tailor your CV for each specific role, generates a polished PDF resume, and delivers both the job alert and your tailored CV directly to your Telegram — completely hands-free, running 24/7 on Railway cloud.

---

## Table of Contents

- [autoApply-ng 🤖](#autoapply-ng-)
  - [Table of Contents](#table-of-contents)
  - [What It Does](#what-it-does)
  - [How It Works](#how-it-works)
  - [Job Platforms](#job-platforms)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [1. Clone and install](#1-clone-and-install)
    - [2. Configure environment](#2-configure-environment)
    - [3. Set up database](#3-set-up-database)
    - [4. Set up Telegram Bot](#4-set-up-telegram-bot)
    - [5. Run locally](#5-run-locally)
  - [Deployment (Railway)](#deployment-railway)
    - [1. Push to GitHub](#1-push-to-github)
    - [2. Create Railway project](#2-create-railway-project)
    - [3. Set environment variables](#3-set-environment-variables)
    - [4. Set start command](#4-set-start-command)
    - [5. Deploy](#5-deploy)
  - [Configuration](#configuration)
    - [Changing job roles](#changing-job-roles)
    - [Changing search frequency](#changing-search-frequency)
    - [Updating your master CV](#updating-your-master-cv)
  - [Sample Telegram Alert](#sample-telegram-alert)
  - [Database Schema](#database-schema)
  - [Adding New Job Platforms](#adding-new-job-platforms)
  - [Roadmap](#roadmap)
    - [v1.0 (Current — April 2026)](#v10-current--april-2026)
    - [v1.1 (Coming Soon)](#v11-coming-soon)
    - [v2.0 (SaaS Version)](#v20-saas-version)
  - [Built With](#built-with)
  - [License](#license)

---

## What It Does

```
Every 6 hours automatically:

  Search Phase:
  → Searches 6+ job platforms simultaneously
  → Filters only jobs posted within the last 7 days
  → Deduplicates across all platforms (no repeat alerts)

  AI Phase:
  → Claude Sonnet reads the job description
  → Rewrites your CV to emphasize relevant skills
  → Writes a personalized cover letter for the company
  → Generates a polished A4 PDF resume

  Notification Phase:
  → Sends Telegram alert: role, company, location, platform, apply link
  → Sends your tailored PDF CV directly to your Telegram chat
  → Never sends you the same job twice — ever

  Daily:
  → Sends a summary at 8pm Lagos time with total jobs found that day
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   node-cron (every 6hrs)                 │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│               Multi-Platform Job Searcher                │
│  Remotive · Arbeitnow · Himalayas · RemoteOK ·           │
│  Wellfound · LinkedIn · (more coming)                    │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│          Deduplication Filter (Prisma + PostgreSQL)      │
│  Checks DB — skips any job already sent to you          │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              BullMQ Worker (concurrency: 1)              │
│                                                          │
│  For each new job:                                       │
│  1. Save to PostgreSQL                                   │
│  2. Call Claude Sonnet API → tailored CV + cover letter  │
│  3. Playwright renders CV → downloads A4 PDF             │
│  4. Send Telegram alert (job details + apply link)       │
│  5. Send PDF file to Telegram                            │
│  6. Mark job as APPLIED in DB                            │
└─────────────────────────────────────────────────────────┘
```

---

## Job Platforms

| Platform | Type | Coverage | Status |
|----------|------|----------|--------|
| Remotive | Official API | Remote / Worldwide | ✅ Active |
| Arbeitnow | Official API | Europe + Remote | ✅ Active |
| Himalayas | Official API | Remote / Worldwide | ✅ Active |
| RemoteOK | Official API | Remote / Worldwide | ✅ Active |
| Wellfound (AngelList) | API | Startups / Remote | ✅ Active |
| LinkedIn | Public Scrape | Worldwide | ✅ Active |
| Jobberman | Scraper | Nigeria | 🔜 Coming |
| MyJobMag | Scraper | Nigeria | 🔜 Coming |
| Jobgurus | Scraper | Nigeria | 🔜 Coming |
| Greenhouse | API | Tech Companies | 🔜 Coming |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 22 + TypeScript | Type-safe backend execution |
| Scheduler | node-cron | Triggers pipeline every 6 hours |
| Job Queue | BullMQ + Redis | Async pipeline with 3x retry logic |
| AI Model | Claude Sonnet API | CV tailoring + cover letter writing |
| PDF Export | Playwright (Chromium) | HTML → polished A4 PDF resume |
| Web Scraping | Axios + Cheerio | LinkedIn and Nigerian job boards |
| Database | Prisma + PostgreSQL | Job tracking and deduplication |
| Notifications | Telegram Bot API | Free job alerts + PDF delivery |
| Deployment | Railway | 24/7 cloud hosting with auto-deploy |

---

## Project Structure

```
autoApply-ng/
│
├── src/
│   ├── index.ts                     ← Main entry point — boots everything
│   │
│   ├── cron/
│   │   └── scheduler.ts             ← node-cron — triggers pipeline every 6hrs
│   │                                   also sends 8pm daily summary
│   │
│   ├── job-searcher/
│   │   └── searcher.ts              ← Multi-platform job search
│   │                                   7-day filter, dedup, platform parsers
│   │
│   ├── cv-tailor/
│   │   └── tailor.ts                ← Claude Sonnet API integration
│   │                                   contains master CV, prompt engineering
│   │                                   returns tailored CV + cover letter JSON
│   │
│   ├── pdf-generator/
│   │   └── generator.ts             ← Playwright HTML → A4 PDF
│   │                                   professional CV formatting
│   │
│   ├── notifier/
│   │   ├── telegram.ts              ← Telegram Bot API
│   │   │                               sendMessage, sendPDF, sendDailySummary
│   │   └── email.ts                 ← Email stub (unused — kept for future)
│   │
│   ├── queue/
│   │   ├── queues.ts                ← BullMQ Queue definitions + job name constants
│   │   ├── redis.ts                 ← IORedis connection singleton
│   │   └── worker.ts                ← BullMQ Worker — full pipeline per job
│   │                                   tailor → PDF → Telegram alert → Telegram PDF
│   │
│   └── db/
│       └── client.ts                ← Prisma Client singleton
│
├── prisma/
│   └── schema.prisma                ← PostgreSQL schema — Job model
│
├── assets/
│   ├── tailored/                    ← CV text + cover letters (per jobId)
│   └── pdfs/                        ← Generated PDF resumes (per jobId)
│
├── .env                             ← Your secrets — NEVER commit this
├── .env.example                     ← Template — safe to commit
├── package.json
├── tsconfig.json
├── railway.toml                     ← Railway deployment config
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# ── Node ──────────────────────────────────────────────
NODE_ENV=production

# ── Database (Railway PostgreSQL) ─────────────────────
DATABASE_URL=postgresql://postgres:password@host:port/railway

# ── Redis (Railway Redis addon) ───────────────────────
REDIS_URL=redis://default:password@host:port

# ── Claude AI (CV Tailoring) ──────────────────────────
# Get from: console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── Telegram Bot ──────────────────────────────────────
# Create bot: Telegram → @BotFather → /newbot
TELEGRAM_BOT_TOKEN=1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Get your chat ID: Telegram → @userinfobot → /start
TELEGRAM_CHAT_ID=1105819207

# ── Job Search Config ─────────────────────────────────
TARGET_ROLES=full-stack,frontend,react,node,python,typescript,javascript

# ── Cron Schedule ─────────────────────────────────────
# Default: every 6 hours
CRON_SCHEDULE=0 */6 * * *

# ── Safety Limit ──────────────────────────────────────
MAX_APPLICATIONS_PER_RUN=5

# ── Puppeteer (skip download — use Playwright's Chrome) ─
PUPPETEER_SKIP_DOWNLOAD=true
```

---

## Installation

### Prerequisites
- Node.js 20+ 
- Redis (local or Railway addon)
- PostgreSQL (local or Railway/Supabase)
- Telegram account

### 1. Clone and install

```bash
git clone https://github.com/Next-ofkin/autoApply-ng.git
cd autoApply-ng
npm install
npx playwright install chromium
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Set up database

```bash
npx prisma db push
npx prisma generate
```

### 4. Set up Telegram Bot

1. Open Telegram → search `@BotFather` → send `/newbot`
2. Follow prompts to create your bot
3. Copy the token → paste as `TELEGRAM_BOT_TOKEN` in `.env`
4. Search `@userinfobot` → send `/start` → copy your ID
5. Paste as `TELEGRAM_CHAT_ID` in `.env`
6. Open your bot → send `/start` to activate it

### 5. Run locally

```bash
npm run dev
```

You should see:
```
╔══════════════════════════════════════╗
║        autoApply-ng  v1.0.0          ║
║   Automated Job Application Bot      ║
║   Lagos, Nigeria — Running 24/7      ║
╚══════════════════════════════════════╝
[Redis] Connected
[App] Database connected ✅
[App] Worker started ✅
[App] Scheduler started ✅
[Scheduler] First run in 15 seconds...
```

---

## Deployment (Railway)

### 1. Push to GitHub

```bash
git add .
git commit -m "initial"
git push origin master
```

### 2. Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Deploy from GitHub → select `autoApply-ng`
3. Add PostgreSQL addon → `+ New → Database → PostgreSQL`
4. Add Redis addon → `+ New → Database → Redis`

### 3. Set environment variables

Go to Railway → autoApply-ng service → Variables → Raw Editor and paste all your `.env` values.

Key Railway-specific values:
```
DATABASE_URL  → copy from Railway PostgreSQL → Variables → DATABASE_URL
REDIS_URL     → copy from Railway Redis → Variables → REDIS_URL
```

### 4. Set start command

Railway → autoApply-ng → Settings → Start Command:
```
npx prisma db push && npx playwright install chromium && node dist/index.js
```

### 5. Deploy

Push any commit to GitHub — Railway auto-deploys on every push.

---

## Configuration

### Changing job roles

Update `TARGET_ROLES` in Railway Variables:
```
TARGET_ROLES=full-stack,frontend,react,node,python,typescript,data analyst,devops
```

### Changing search frequency

Update `CRON_SCHEDULE` in Railway Variables:
```
0 */6 * * *    ← every 6 hours (default)
0 */3 * * *    ← every 3 hours
0 8,14,20 * * * ← at 8am, 2pm, 8pm daily
*/30 * * * *   ← every 30 mins (testing only)
```

### Updating your master CV

Edit the `MASTER_CV` constant in `src/cv-tailor/tailor.ts` with your current CV text. Push to GitHub — Railway auto-deploys.

---

## Sample Telegram Alert

```
🔔 New Job Found!

💼 Role:     Senior React Developer
🏢 Company:  GitLab (USA)
📍 Location: Remote / Worldwide
🌐 Platform: Remotive
📅 Posted:   20/04/2026

👉 Apply Here ← clickable link

📎 tailored-cv.pdf ← Claude-tailored CV for this exact role
```

Followed immediately by a PDF document attachment containing your tailored CV specifically written for that role and company.

---

## Database Schema

```prisma
model Job {
  id              String    @id @default(cuid())
  jobId           String    @unique          // Platform-specific ID (e.g. "remotive-12345")
  title           String                     // Job title
  company         String                     // Company name
  location        String                     // Job location
  applyUrl        String                     // Application URL
  description     String                     // Raw job description
  status          String    @default("FOUND") // FOUND → APPLIED | FAILED
  tailoredCvPath  String?                    // Path to generated PDF
  coverLetterPath String?                    // Path to cover letter text
  appliedAt       DateTime?                  // When bot notified you
  emailSentAt     DateTime?                  // When email was sent
  errorMessage    String?                    // Error details if failed
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## Adding New Job Platforms

To add a new job platform, add a function to `src/job-searcher/searcher.ts`:

```typescript
async function searchNewPlatform(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  try {
    const { data } = await axios.get('https://api.newplatform.com/jobs', {
      params: { q: 'developer', remote: true },
      timeout: 15000,
    })

    for (const item of data.jobs) {
      const postedAt = new Date(item.created_at)
      if (postedAt < oneWeekAgo) continue  // ← always filter by 7 days

      jobs.push({
        jobId: 'newplatform-' + item.id,   // ← always prefix with platform name
        title: item.title,
        company: item.company,
        location: item.location || 'Remote',
        applyUrl: item.apply_url,
        description: item.description || '',
        platform: 'New Platform',          // ← displayed in Telegram alert
        postedDate: postedAt.toLocaleDateString('en-NG'),
      })
    }
  } catch (err: any) {
    console.error('[NewPlatform] Error: ' + err.message)
  }

  console.log('[NewPlatform] ' + jobs.length + ' jobs')
  return jobs
}
```

Then add it to `searchAllJobs()`:
```typescript
const results = await Promise.allSettled([
  searchRemotive(),
  searchArbeitnow(),
  searchNewPlatform(),  // ← add here
  ...
])
```

---

## Roadmap

### v1.0 (Current — April 2026)
- ✅ Multi-platform job search (6 platforms)
- ✅ 7-day freshness filter
- ✅ Cross-platform deduplication
- ✅ Claude AI CV tailoring per job
- ✅ Playwright PDF generation
- ✅ Telegram alerts + PDF delivery
- ✅ Daily summary notifications
- ✅ Railway 24/7 deployment
- ✅ BullMQ retry logic

### v1.1 (Coming Soon)
- 🔜 Jobberman Nigeria
- 🔜 MyJobMag Nigeria
- 🔜 Jobgurus Nigeria
- 🔜 Greenhouse API (top tech companies)
- 🔜 Better LinkedIn scraping

### v2.0 (SaaS Version)
- 🔜 Web dashboard (Next.js)
- 🔜 Multi-user support
- 🔜 User uploads their own CV
- 🔜 User connects their own Telegram
- 🔜 Stripe payments (₦5,000/month Pro)
- 🔜 Job match scoring
- 🔜 Application history dashboard

---

## Built With

This project was built using the **Antigravity development methodology** — live co-building with Claude AI, prompt by prompt, shipping production code incrementally.

- **Developer:** Excel L. Shogbola
- **Role:** Technical Product Manager + Full Stack Developer
- **Company:** NOLT Finance + Strings Automation
- **Location:** Victoria Island, Lagos, Nigeria
- **GitHub:** [github.com/Next-ofkin](https://github.com/Next-ofkin)
- **LinkedIn:** [linkedin.com/in/excel-shogbola-710ba0244](https://linkedin.com/in/excel-shogbola-710ba0244)

---

## License

MIT License — free to use, modify, and distribute.

---

*autoApply-ng — Built in Lagos, hunting jobs worldwide* 🇳🇬🚀