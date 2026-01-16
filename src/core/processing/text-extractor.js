import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min?url'

// Set up PDF.js worker (bundled locally)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/**
 * Extract text from various file types
 * @param {File} file - The file to extract text from
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractText(file) {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractFromTxt(file)
  }

  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return extractFromDocx(file)
  }

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractFromPdf(file)
  }

  // VTT and SRT files
  if (fileName.endsWith('.vtt')) {
    return extractFromVtt(file)
  }

  if (fileName.endsWith('.srt')) {
    return extractFromSrt(file)
  }

  throw new Error(`Unsupported file type: ${fileType || fileName}`)
}

/**
 * Extract text from plain text file
 */
async function extractFromTxt(file) {
  return await file.text()
}

/**
 * Extract text from DOCX file using mammoth
 */
async function extractFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * Extract text from PDF file using pdf.js
 */
async function extractFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str).join(' ')
    fullText += pageText + '\n\n'
  }

  return fullText.trim()
}

/**
 * Extract text from WebVTT subtitle file
 * Removes timestamps and metadata, keeps only the text
 */
async function extractFromVtt(file) {
  const content = await file.text()
  const lines = content.split('\n')
  const textLines = []

  let inCue = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip WEBVTT header and empty lines
    if (trimmed === 'WEBVTT' || trimmed === '') {
      inCue = false
      continue
    }

    // Skip timestamp lines (contain -->)
    if (trimmed.includes('-->')) {
      inCue = true
      continue
    }

    // Skip cue identifiers (usually numbers or NOTE)
    if (/^\d+$/.test(trimmed) || trimmed.startsWith('NOTE')) {
      continue
    }

    // This is actual text content
    if (inCue && trimmed) {
      // Remove VTT tags like <v Speaker> or <c>
      const cleanText = trimmed.replace(/<[^>]+>/g, '')
      if (cleanText) {
        textLines.push(cleanText)
      }
    }
  }

  return textLines.join(' ')
}

/**
 * Extract text from SRT subtitle file
 * Removes timestamps and sequence numbers, keeps only the text
 */
async function extractFromSrt(file) {
  const content = await file.text()
  const lines = content.split('\n')
  const textLines = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines
    if (trimmed === '') continue

    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(trimmed)) continue

    // Skip timestamp lines (contain -->)
    if (trimmed.includes('-->')) continue

    // This is actual text content
    textLines.push(trimmed)
  }

  return textLines.join(' ')
}
