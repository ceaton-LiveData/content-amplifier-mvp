import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { getContentHistory, unarchiveContent } from '../../infrastructure/database/supabase'

const CONTENT_TYPE_CONFIG = {
  linkedin_post: {
    label: 'LinkedIn',
    icon: 'in',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  blog_post: {
    label: 'Blog',
    icon: 'B',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  email_sequence: {
    label: 'Email',
    icon: 'E',
    badgeClass: 'bg-green-100 text-green-700',
  },
  twitter_thread: {
    label: 'Twitter',
    icon: 'X',
    badgeClass: 'bg-gray-100 text-gray-700',
  },
  executive_summary: {
    label: 'Summary',
    icon: 'S',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
}

const STATUS_CONFIG = {
  published: { label: 'Published', badgeClass: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', badgeClass: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', badgeClass: 'bg-blue-100 text-blue-700' },
  draft: { label: 'Draft', badgeClass: 'bg-yellow-100 text-yellow-700' },
  unscheduled: { label: 'Active', badgeClass: 'bg-indigo-100 text-indigo-700' },
}

export default function ContentHistory() {
  const { account } = useAuth()
  const navigate = useNavigate()

  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (account?.id) {
      loadContent()
    }
  }, [account?.id])

  async function loadContent() {
    try {
      setLoading(true)
      const data = await getContentHistory(account.id)
      setContent(data)
    } catch (err) {
      console.error('Failed to load content history:', err)
      setError('Failed to load content history')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnarchive(item) {
    if (!confirm('Restore this content? It will appear in the calendar again.')) {
      return
    }

    try {
      setProcessing(true)
      await unarchiveContent(item.id)
      // Update local state
      setContent(prev => prev.map(c =>
        c.id === item.id
          ? { ...c, is_archived: false, displayStatus: 'unscheduled' }
          : c
      ))
      setSelectedItem(null)
    } catch (err) {
      console.error('Failed to unarchive content:', err)
      setError('Failed to restore content')
    } finally {
      setProcessing(false)
    }
  }

  // Filter and search content
  const filteredContent = content.filter(item => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesText = item.content_text.toLowerCase().includes(search)
      const matchesSource = (item.content_sources?.title || item.content_sources?.original_filename || '').toLowerCase().includes(search)
      if (!matchesText && !matchesSource) return false
    }

    // Type filter
    if (filterType !== 'all' && item.content_type !== filterType) {
      return false
    }

    // Status filter
    if (filterStatus !== 'all' && item.displayStatus !== filterStatus) {
      return false
    }

    return true
  })

  // Group by date for display
  const groupedByDate = filteredContent.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(item)
    return acc
  }, {})

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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Content History</h1>
          <p className="text-gray-600 mt-1">View and manage all your generated content</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search content or source..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Content Type Filter */}
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                <option value="linkedin_post">LinkedIn</option>
                <option value="blog_post">Blog</option>
                <option value="email_sequence">Email</option>
                <option value="twitter_thread">Twitter</option>
                <option value="executive_summary">Summary</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
                <option value="scheduled">Scheduled</option>
                <option value="unscheduled">Active</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-500">
            Showing {filteredContent.length} of {content.length} items
          </div>
        </div>

        {/* Content Table */}
        {filteredContent.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <p className="text-gray-500 mb-2">No content found</p>
            <p className="text-sm text-gray-400">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Generate some content to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{date}</h3>
                <div className="card p-0 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map(item => {
                        const typeConfig = CONTENT_TYPE_CONFIG[item.content_type] || CONTENT_TYPE_CONFIG.linkedin_post
                        const statusConfig = STATUS_CONFIG[item.displayStatus] || STATUS_CONFIG.unscheduled

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedItem(item)}
                          >
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${typeConfig.badgeClass}`}>
                                <span className="font-bold">{typeConfig.icon}</span>
                                {typeConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-900 truncate max-w-md">
                                {item.content_text.substring(0, 80)}...
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-gray-500 truncate max-w-[120px]" title={item.content_sources?.title || item.content_sources?.original_filename}>
                                {item.content_sources?.title || item.content_sources?.original_filename || 'Unknown'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusConfig.badgeClass}`}>
                                {statusConfig.label}
                              </span>
                              {item.publishedAt && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(item.publishedAt).toLocaleDateString()}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedItem(item)
                                }}
                                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {(() => {
                    const typeConfig = CONTENT_TYPE_CONFIG[selectedItem.content_type] || CONTENT_TYPE_CONFIG.linkedin_post
                    const statusConfig = STATUS_CONFIG[selectedItem.displayStatus] || STATUS_CONFIG.unscheduled
                    return (
                      <>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${typeConfig.badgeClass}`}>
                          <span className="font-bold">{typeConfig.icon}</span>
                          {typeConfig.label}
                        </span>
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusConfig.badgeClass}`}>
                          {statusConfig.label}
                        </span>
                      </>
                    )
                  })()}
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {/* Metadata */}
                <div className="mb-4 space-y-1 text-sm text-gray-500">
                  <p>
                    <span className="font-medium">Source:</span>{' '}
                    <button
                      onClick={() => navigate(`/content/${selectedItem.content_sources?.id}`)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {selectedItem.content_sources?.title || selectedItem.content_sources?.original_filename}
                    </button>
                  </p>
                  <p>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </p>
                  {selectedItem.publishedAt && (
                    <p>
                      <span className="font-medium">Published:</span>{' '}
                      {new Date(selectedItem.publishedAt).toLocaleString()}
                    </p>
                  )}
                  {selectedItem.scheduledDate && !selectedItem.publishedAt && (
                    <p>
                      <span className="font-medium">Scheduled for:</span>{' '}
                      {new Date(selectedItem.scheduledDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedItem.content_text}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedItem.content_text.length} characters
                </p>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedItem.content_text)
                  }}
                  className="btn-secondary flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </button>

                {selectedItem.displayStatus === 'archived' && (
                  <button
                    onClick={() => handleUnarchive(selectedItem)}
                    disabled={processing}
                    className="btn-secondary flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {processing ? 'Restoring...' : 'Restore'}
                  </button>
                )}

                <button
                  onClick={() => navigate(`/content/${selectedItem.content_sources?.id}`)}
                  className="btn-secondary flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Source
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
