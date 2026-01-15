import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { getContentSource, listContentBySource, createScheduledPost } from '../../infrastructure/database/supabase'

const CONTENT_TYPE_LABELS = {
  linkedin_post: 'LinkedIn Posts',
  blog_post: 'Blog Post',
  email_sequence: 'Email Sequence',
  twitter_thread: 'Twitter Thread',
  executive_summary: 'Executive Summary',
}

const LINKEDIN_LENGTH_LABELS = {
  short: { name: 'Short', color: 'bg-blue-100 text-blue-700' },
  medium: { name: 'Medium', color: 'bg-green-100 text-green-700' },
  long: { name: 'Long', color: 'bg-purple-100 text-purple-700' },
}

export default function ContentLibrary() {
  const { sourceId } = useParams()
  const navigate = useNavigate()
  const { account } = useAuth()

  const [source, setSource] = useState(null)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedContent, setSelectedContent] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    loadData()
  }, [sourceId])

  async function loadData() {
    try {
      const [sourceData, contentData] = await Promise.all([
        getContentSource(sourceId),
        listContentBySource(sourceId),
      ])
      setSource(sourceData)
      setContent(contentData)
    } catch (err) {
      setError('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  // Group content by type
  const contentByType = content.reduce((acc, item) => {
    if (!acc[item.content_type]) {
      acc[item.content_type] = []
    }
    acc[item.content_type].push(item)
    return acc
  }, {})

  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadAsText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadAsMarkdown(text, filename) {
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
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

        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{source?.title || source?.original_filename}</h1>
            <p className="text-gray-600 mt-1">
              Generated {content.length} content pieces
            </p>
          </div>
          {content.length > 0 && (
            <button
              onClick={() => navigate(`/generate/${sourceId}`)}
              className="btn-secondary flex items-center"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generate More
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Verification Disclaimer */}
        {content.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-amber-800">Review before publishing</h3>
                <p className="text-sm text-amber-700 mt-1">
                  This content is generated from your transcript. Please verify all facts, statistics, and claims before posting.
                  Look for <span className="font-medium">[VERIFY]</span> tags that highlight statements needing source links or fact-checking.
                </p>
              </div>
            </div>
          </div>
        )}

        {content.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">No content generated yet.</p>
            <button
              onClick={() => navigate(`/generate/${sourceId}`)}
              className="btn-primary"
            >
              Generate Content
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(contentByType).map(([type, items]) => (
              <div key={type}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {CONTENT_TYPE_LABELS[type] || type} ({items.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="card cursor-pointer hover:border-primary-300 transition-colors"
                      onClick={() => setSelectedContent(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          {type === 'email_sequence' && item.content_metadata?.subject
                            ? `Email ${index + 1}: ${item.content_metadata.subject.substring(0, 30)}...`
                            : `#${index + 1}`
                          }
                        </span>
                        {type === 'linkedin_post' && item.content_metadata?.linkedin_length && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${LINKEDIN_LENGTH_LABELS[item.content_metadata.linkedin_length]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {LINKEDIN_LENGTH_LABELS[item.content_metadata.linkedin_length]?.name || item.content_metadata.linkedin_length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {item.content_text.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content Detail Modal */}
        {selectedContent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {CONTENT_TYPE_LABELS[selectedContent.content_type]}
                  {selectedContent.content_type === 'linkedin_post' && selectedContent.content_metadata?.linkedin_length && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${LINKEDIN_LENGTH_LABELS[selectedContent.content_metadata.linkedin_length]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {LINKEDIN_LENGTH_LABELS[selectedContent.content_metadata.linkedin_length]?.name}
                    </span>
                  )}
                  {selectedContent.content_metadata?.subject && (
                    <span className="text-gray-500 font-normal">
                      - {selectedContent.content_metadata.subject}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {selectedContent.content_text}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t flex flex-wrap gap-2">
                <button
                  onClick={() => copyToClipboard(selectedContent.content_text)}
                  className="btn-primary flex items-center"
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadAsText(selectedContent.content_text, `${selectedContent.content_type}-${selectedContent.id.substring(0, 8)}`)}
                  className="btn-secondary flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .txt
                </button>
                <button
                  onClick={() => downloadAsMarkdown(selectedContent.content_text, `${selectedContent.content_type}-${selectedContent.id.substring(0, 8)}`)}
                  className="btn-secondary flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .md
                </button>
                {selectedContent.content_type === 'linkedin_post' && (
                  <button
                    onClick={() => {
                      setShowScheduleModal(true)
                      // Default to tomorrow
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setScheduleDate(tomorrow.toISOString().split('T')[0])
                      setScheduleTime('09:00')
                    }}
                    className="btn-secondary flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && selectedContent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Add to Calendar</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time (optional)</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to schedule for any time that day</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {selectedContent.content_text.substring(0, 150)}...
                  </p>
                </div>
              </div>
              <div className="p-4 border-t flex gap-2 justify-end">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="btn-secondary"
                  disabled={scheduling}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!scheduleDate) return
                    setScheduling(true)
                    try {
                      await createScheduledPost({
                        account_id: account.id,
                        content_id: selectedContent.id,
                        platform: 'linkedin',
                        scheduled_date: scheduleDate,
                        scheduled_time: scheduleTime || null,
                        post_text: selectedContent.content_text,
                        status: 'scheduled',
                      })
                      setShowScheduleModal(false)
                      setSelectedContent(null)
                      navigate('/calendar')
                    } catch (err) {
                      console.error('Failed to schedule post:', err)
                      setError('Failed to add to calendar')
                    } finally {
                      setScheduling(false)
                    }
                  }}
                  className="btn-primary"
                  disabled={scheduling || !scheduleDate}
                >
                  {scheduling ? 'Adding...' : 'Add to Calendar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
