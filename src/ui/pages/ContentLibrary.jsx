import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getContentSource, listContentBySource } from '../../infrastructure/database/supabase'

const CONTENT_TYPE_LABELS = {
  linkedin_post: 'LinkedIn Posts',
  blog_post: 'Blog Post',
  email_sequence: 'Email Sequence',
  twitter_thread: 'Twitter Thread',
  executive_summary: 'Executive Summary',
}

export default function ContentLibrary() {
  const { sourceId } = useParams()
  const navigate = useNavigate()

  const [source, setSource] = useState(null)
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedContent, setSelectedContent] = useState(null)
  const [copied, setCopied] = useState(false)

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{source?.title || source?.original_filename}</h1>
          <p className="text-gray-600 mt-1">
            Generated {content.length} content pieces
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
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
                <h3 className="font-semibold text-gray-900">
                  {CONTENT_TYPE_LABELS[selectedContent.content_type]}
                  {selectedContent.content_metadata?.subject && (
                    <span className="text-gray-500 font-normal ml-2">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
