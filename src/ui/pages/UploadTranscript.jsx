import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import FileUpload from '../components/FileUpload'
import { useAuth } from '../hooks/useAuth'
import { extractText } from '../../core/processing/text-extractor'
import { createContentSource } from '../../infrastructure/database/supabase'

const ACCEPTED_TYPES = {
  'text/plain': '.txt',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/vtt': '.vtt',
  'application/x-subrip': '.srt',
}

export default function UploadTranscript() {
  const { account } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState(null)

  async function handleFileSelect(selectedFile) {
    setFile(selectedFile)
    setError(null)
    setExtracting(true)

    try {
      const text = await extractText(selectedFile)
      setExtractedText(text)
      // Auto-fill title from filename (without extension)
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '')
      setTitle(nameWithoutExt)
    } catch (err) {
      setError(`Failed to extract text: ${err.message}`)
      setFile(null)
    } finally {
      setExtracting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!extractedText) return

    setLoading(true)
    setError(null)

    try {
      const source = await createContentSource(account.id, {
        original_filename: file.name,
        transcript_text: extractedText,
        title: title || file.name,
        notes: notes || null,
        file_size_bytes: file.size,
      })

      // Navigate to content generation page
      navigate(`/generate/${source.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Transcript</h1>
          <p className="text-gray-600 mb-6">
            Upload a transcript file to generate content from it.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transcript File
                </label>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  accept={ACCEPTED_TYPES}
                  maxSize={25 * 1024 * 1024} // 25MB
                  disabled={extracting || loading}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supported: .txt, .pdf, .docx, .vtt, .srt (max 25MB)
                </p>
              </div>

              {/* Extracting indicator */}
              {extracting && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="animate-spin h-4 w-4 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extracting text from file...
                </div>
              )}

              {/* Preview */}
              {extractedText && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Preview</span>
                    <span className="text-xs text-gray-500">
                      {extractedText.length.toLocaleString()} characters
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {extractedText.substring(0, 500)}
                    {extractedText.length > 500 && '...'}
                  </p>
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title (optional)
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="e.g., Q4 Strategy Webinar"
                  disabled={loading}
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[80px]"
                  placeholder="Any notes about this transcript..."
                  disabled={loading}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!extractedText || loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Continue to Generate Content'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
