import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { getContentSource, listContentBySource, createScheduledPost, updateGeneratedContent, archiveContent, bulkArchiveContent } from '../../infrastructure/database/supabase'

const CONTENT_TYPE_LABELS = {
  linkedin_post: 'LinkedIn Posts',
  blog_post: 'Blog Post',
  email_sequence: 'Email Sequence',
  single_email: 'Single Email',
  twitter_thread: 'Twitter Thread',
  executive_summary: 'Executive Summary',
}

const LINKEDIN_LENGTH_LABELS = {
  short: { name: 'Short', color: 'bg-blue-100 text-blue-700' },
  medium: { name: 'Medium', color: 'bg-green-100 text-green-700' },
  long: { name: 'Long', color: 'bg-purple-100 text-purple-700' },
}

// Helper to check if content is "new" (created within last 24 hours)
function isNewContent(createdAt) {
  if (!createdAt) return false
  const created = new Date(createdAt)
  const now = new Date()
  const hoursDiff = (now - created) / (1000 * 60 * 60)
  return hoursDiff <= 24
}

// Helper to format relative time
function formatRelativeTime(createdAt) {
  if (!createdAt) return ''
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now - created
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return created.toLocaleDateString()
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
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkArchiving, setBulkArchiving] = useState(false)

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

  function startEditing() {
    setEditedText(selectedContent.content_text)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditedText('')
  }

  async function saveEdits() {
    if (!editedText.trim() || editedText === selectedContent.content_text) {
      cancelEditing()
      return
    }

    setSaving(true)
    try {
      await updateGeneratedContent(selectedContent.id, {
        content_text: editedText,
      })
      // Update local state
      setContent(prev => prev.map(item =>
        item.id === selectedContent.id
          ? { ...item, content_text: editedText }
          : item
      ))
      setSelectedContent(prev => ({ ...prev, content_text: editedText }))
      setIsEditing(false)
      setEditedText('')
    } catch (err) {
      console.error('Failed to save edits:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!selectedContent) return

    if (!confirm('Archive this content? It will be hidden from the library but can be viewed in Content History.')) {
      return
    }

    setSaving(true)
    try {
      await archiveContent(selectedContent.id)
      // Remove from local state
      setContent(prev => prev.filter(item => item.id !== selectedContent.id))
      setSelectedContent(null)
    } catch (err) {
      console.error('Failed to archive content:', err)
      setError('Failed to archive content')
    } finally {
      setSaving(false)
    }
  }

  function toggleSelectMode() {
    setSelectMode(!selectMode)
    setSelectedIds(new Set())
  }

  function toggleItemSelection(id, e) {
    e.stopPropagation()
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function selectAllInType(type) {
    const typeItems = contentByType[type] || []
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      typeItems.forEach(item => newSet.add(item.id))
      return newSet
    })
  }

  function deselectAllInType(type) {
    const typeItems = contentByType[type] || []
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      typeItems.forEach(item => newSet.delete(item.id))
      return newSet
    })
  }

  async function handleBulkArchive() {
    if (selectedIds.size === 0) return

    if (!confirm(`Archive ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? They will be hidden from the library but can be viewed in Content History.`)) {
      return
    }

    setBulkArchiving(true)
    try {
      await bulkArchiveContent(Array.from(selectedIds))
      // Remove archived items from local state
      setContent(prev => prev.filter(item => !selectedIds.has(item.id)))
      setSelectedIds(new Set())
      setSelectMode(false)
    } catch (err) {
      console.error('Failed to bulk archive:', err)
      setError('Failed to archive selected content')
    } finally {
      setBulkArchiving(false)
    }
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
          <div className="flex items-center gap-2">
            {content.length > 0 && (
              <>
                <button
                  onClick={toggleSelectMode}
                  className={`btn-secondary flex items-center ${selectMode ? 'bg-gray-200' : ''}`}
                >
                  {selectMode ? (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Select
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate(`/generate/${sourceId}`)}
                  className="btn-secondary flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generate More
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-primary-800">
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkArchive}
              disabled={bulkArchiving}
              className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              {bulkArchiving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Archiving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archive Selected
                </>
              )}
            </button>
          </div>
        )}

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
            {Object.entries(contentByType).map(([type, items]) => {
              const typeSelectedCount = items.filter(item => selectedIds.has(item.id)).length
              const allTypeSelected = typeSelectedCount === items.length
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {CONTENT_TYPE_LABELS[type] || type} ({items.length})
                    </h2>
                    {selectMode && (
                      <button
                        onClick={() => allTypeSelected ? deselectAllInType(type) : selectAllInType(type)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        {allTypeSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item, index) => {
                      const isNew = isNewContent(item.created_at)
                      const isSelected = selectedIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`card cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'hover:border-primary-300'
                          }`}
                          onClick={() => selectMode ? toggleItemSelection(item.id, { stopPropagation: () => {} }) : setSelectedContent(item)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {selectMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => toggleItemSelection(item.id, e)}
                                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              <span className="text-sm font-medium text-gray-500">
                                {type === 'email_sequence' && item.content_metadata?.subject
                                  ? `Email ${index + 1}: ${item.content_metadata.subject.substring(0, 30)}${item.content_metadata.subject.length > 30 ? '...' : ''}`
                                  : `#${index + 1}`
                                }
                              </span>
                              {isNew && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(item.created_at)}
                              </span>
                              {type === 'linkedin_post' && item.content_metadata?.linkedin_length && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${LINKEDIN_LENGTH_LABELS[item.content_metadata.linkedin_length]?.color || 'bg-gray-100 text-gray-600'}`}>
                                  {LINKEDIN_LENGTH_LABELS[item.content_metadata.linkedin_length]?.name || item.content_metadata.linkedin_length}
                                </span>
                              )}
                              {type === 'email_sequence' && item.content_metadata?.send_day && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  Day {item.content_metadata.send_day}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {item.content_text.substring(0, 150)}...
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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
                  onClick={() => {
                    setSelectedContent(null)
                    setIsEditing(false)
                    setEditedText('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* Email metadata (preview text, send day) */}
                {(selectedContent.content_type === 'email_sequence' || selectedContent.content_type === 'single_email') && selectedContent.content_metadata && !isEditing && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                    {selectedContent.content_metadata.preview_text && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Preview Text:</span>
                        <p className="text-sm text-gray-700">{selectedContent.content_metadata.preview_text}</p>
                      </div>
                    )}
                    {selectedContent.content_metadata.send_day && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Suggested Send:</span>
                        <span className="text-sm text-gray-700 ml-2">Day {selectedContent.content_metadata.send_day}</span>
                      </div>
                    )}
                  </div>
                )}
                {isEditing ? (
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-full min-h-[300px] p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm font-mono"
                    placeholder="Edit your content..."
                  />
                ) : (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {selectedContent.content_text}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveEdits}
                      disabled={saving}
                      className="btn-primary flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startEditing}
                      className="btn-secondary flex items-center"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
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
                    {['linkedin_post', 'blog_post', 'email_sequence', 'single_email'].includes(selectedContent.content_type) && (
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
                    <button
                      onClick={handleArchive}
                      disabled={saving}
                      className="btn-secondary flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive
                    </button>
                  </>
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
                    // Map content type to platform
                    const platformMap = {
                      linkedin_post: 'linkedin',
                      blog_post: 'blog',
                      email_sequence: 'email',
                      single_email: 'email',
                      twitter_thread: 'twitter',
                    }
                    const platform = platformMap[selectedContent.content_type] || 'other'
                    try {
                      await createScheduledPost({
                        account_id: account.id,
                        content_id: selectedContent.id,
                        platform,
                        scheduled_date: scheduleDate,
                        scheduled_time: scheduleTime || null,
                        post_text: selectedContent.content_text,
                        status: 'scheduled',
                      })
                      setShowScheduleModal(false)
                      setSelectedContent(null)
                      navigate('/calendar')
                    } catch (err) {
                      console.error('Failed to schedule content:', err)
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
