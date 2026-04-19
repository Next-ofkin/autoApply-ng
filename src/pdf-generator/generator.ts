import * as fs from 'fs'
import * as path from 'path'

export async function generatePDF(cvText: string, jobId: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'assets', 'pdfs')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${jobId}-cv.txt`)
  fs.writeFileSync(outputPath, cvText)
  console.log(`[PDF Generator] Saved CV text: ${outputPath}`)
  return outputPath
}