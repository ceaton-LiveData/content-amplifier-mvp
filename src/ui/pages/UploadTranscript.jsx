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

const SOURCE_TYPES = [
  {
    id: 'transcript',
    name: 'Transcript',
    description: 'Video/audio transcript, interview, podcast, or webinar recording',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: 'article',
    name: 'Article / Blog Post',
    description: 'Existing article, blog post, or long-form content to repurpose',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'topic',
    name: 'Topic / Idea Brief',
    description: 'A topic description, outline, or idea to expand into full content',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'notes',
    name: 'Meeting Notes / Research',
    description: 'Meeting notes, research findings, or raw information to transform',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
]

export default function UploadTranscript() {
  const { account } = useAuth()
  const navigate = useNavigate()

  const [sourceType, setSourceType] = useState('transcript')
  const [file, setFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [inputMethod, setInputMethod] = useState('file') // 'file' or 'paste'
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState(null)

  const currentSourceType = SOURCE_TYPES.find(t => t.id === sourceType)
  const contentText = inputMethod === 'file' ? extractedText : pastedText

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

  function handlePastedTextChange(e) {
    setPastedText(e.target.value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!contentText) return

    setLoading(true)
    setError(null)

    try {
      const source = await createContentSource(account.id, {
        source_type: sourceType,
        original_filename: file?.name || `${sourceType}-${Date.now()}.txt`,
        transcript_text: contentText,
        title: title || (file?.name ? file.name.replace(/\.[^/.]+$/, '') : `${currentSourceType.name} - ${new Date().toLocaleDateString()}`),
        notes: notes || null,
        file_size_bytes: file?.size || contentText.length,
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Add Source Content</h1>
          <p className="text-gray-600 mb-6">
            Upload or paste content to transform into multiple formats.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Source Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of content are you adding?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSourceType(type.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        sourceType === type.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`mb-2 ${sourceType === type.id ? 'text-primary-600' : 'text-gray-400'}`}>
                        {type.icon}
                      </div>
                      <div className="font-medium text-gray-900">{type.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Method Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you like to add your content?
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setInputMethod('file')}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                      inputMethod === 'file'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMethod('paste')}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                      inputMethod === 'paste'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              {/* File Upload */}
              {inputMethod === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
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
              )}

              {/* Paste Text */}
              {inputMethod === 'paste' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Your Content
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={handlePastedTextChange}
                    className="input min-h-[200px] font-mono text-sm"
                    placeholder={
                      sourceType === 'transcript'
                        ? 'Paste your transcript text here...'
                        : sourceType === 'article'
                        ? 'Paste your article or blog post content here...'
                        : sourceType === 'topic'
                        ? 'Describe your topic, outline, or idea here...'
                        : 'Paste your notes or research content here...'
                    }
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {pastedText.length.toLocaleString()} characters
                  </p>
                </div>
              )}

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

              {/* Preview (for file upload) */}
              {inputMethod === 'file' && extractedText && (
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
                  placeholder={
                    sourceType === 'transcript'
                      ? 'e.g., Q4 Strategy Webinar'
                      : sourceType === 'article'
                      ? 'e.g., The Future of AI in Healthcare'
                      : sourceType === 'topic'
                      ? 'e.g., Remote Work Best Practices'
                      : 'e.g., Product Launch Meeting Notes'
                  }
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
                  placeholder="Any context or notes about this content..."
                  disabled={loading}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!contentText || loading}
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
