import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import {
  listScheduledPosts,
  updateScheduledPost,
  deleteScheduledPost,
  createScheduledPost,
  getUnscheduledContent,
  updateGeneratedContent,
  archiveContent,
} from '../../infrastructure/database/supabase'

const STATUS_COLORS = {
  draft: { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
  scheduled: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  published: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  failed: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  cancelled: { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' },
}

const LINKEDIN_LENGTH_LABELS = {
  short: { name: 'Short', color: 'bg-blue-100 text-blue-700' },
  medium: { name: 'Medium', color: 'bg-green-100 text-green-700' },
  long: { name: 'Long', color: 'bg-purple-100 text-purple-700' },
}

// Content type configuration with colors and icons
const CONTENT_TYPE_CONFIG = {
  linkedin_post: {
    label: 'LinkedIn',
    icon: 'in',
    color: { bg: '#dbeafe', border: '#0077b5', text: '#1e40af' },
    badgeClass: 'bg-blue-600 text-white',
  },
  blog_post: {
    label: 'Blog',
    icon: 'B',
    color: { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
    badgeClass: 'bg-amber-500 text-white',
  },
  email_sequence: {
    label: 'Email',
    icon: 'E',
    color: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
    badgeClass: 'bg-green-600 text-white',
  },
  twitter_thread: {
    label: 'Twitter',
    icon: 'X',
    color: { bg: '#f3f4f6', border: '#374151', text: '#1f2937' },
    badgeClass: 'bg-gray-800 text-white',
  },
  executive_summary: {
    label: 'Summary',
    icon: 'S',
    color: { bg: '#ede9fe', border: '#7c3aed', text: '#5b21b6' },
    badgeClass: 'bg-purple-600 text-white',
  },
}

// Map platform to content type (for scheduled posts)
const PLATFORM_TO_CONTENT_TYPE = {
  linkedin: 'linkedin_post',
  blog: 'blog_post',
  email: 'email_sequence',
  twitter: 'twitter_thread',
  other: 'executive_summary',
}

export default function Calendar() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const calendarRef = useRef(null)

  const [posts, setPosts] = useState([])
  const [unscheduledPosts, setUnscheduledPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [viewType, setViewType] = useState('dayGridMonth')
  const [showUnscheduled, setShowUnscheduled] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [quickSchedulePost, setQuickSchedulePost] = useState(null)
  const [quickScheduleDate, setQuickScheduleDate] = useState('')
  const [quickScheduleTime, setQuickScheduleTime] = useState('09:00')
  const [viewUnscheduledPost, setViewUnscheduledPost] = useState(null)
  const [editingUnscheduled, setEditingUnscheduled] = useState(false)
  const [editedUnscheduledText, setEditedUnscheduledText] = useState('')
  const [activeContentTab, setActiveContentTab] = useState('linkedin_post')

  useEffect(() => {
    if (account?.id) {
      loadAllData()
    }
  }, [account?.id])

  async function loadAllData() {
    try {
      setLoading(true)
      const [scheduledData, unscheduledData] = await Promise.all([
        listScheduledPosts(account.id),
        getUnscheduledContent(account.id),
      ])
      setPosts(scheduledData)
      setUnscheduledPosts(unscheduledData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  async function loadPosts() {
    try {
      const data = await listScheduledPosts(account.id)
      setPosts(data)
    } catch (err) {
      console.error('Failed to load scheduled posts:', err)
      setError('Failed to load calendar')
    }
  }

  async function loadUnscheduledPosts() {
    try {
      const data = await getUnscheduledContent(account.id)
      setUnscheduledPosts(data)
    } catch (err) {
      console.error('Failed to load unscheduled content:', err)
    }
  }

  // Convert posts to FullCalendar events
  const events = posts.map(post => {
    // Get content type from the generated_content or from platform mapping
    const contentType = post.generated_content?.content_type || PLATFORM_TO_CONTENT_TYPE[post.platform] || 'linkedin_post'
    const typeConfig = CONTENT_TYPE_CONFIG[contentType] || CONTENT_TYPE_CONFIG.linkedin_post

    // Use content type colors, but adjust for status if not scheduled
    let colors = typeConfig.color
    if (post.status === 'published') {
      colors = STATUS_COLORS.published
    } else if (post.status === 'failed') {
      colors = STATUS_COLORS.failed
    } else if (post.status === 'draft') {
      colors = STATUS_COLORS.draft
    }

    return {
      id: post.id,
      title: `[${typeConfig.icon}] ${post.post_text.substring(0, 40)}${post.post_text.length > 40 ? '...' : ''}`,
      start: post.scheduled_time
        ? `${post.scheduled_date}T${post.scheduled_time}`
        : post.scheduled_date,
      allDay: !post.scheduled_time,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        ...post,
        contentType,
      },
    }
  })

  async function handleEventDrop(info) {
    const { event } = info
    const postId = event.id
    const newDate = event.start.toISOString().split('T')[0]
    const newTime = event.allDay ? null : event.start.toTimeString().slice(0, 5)

    try {
      await updateScheduledPost(postId, {
        scheduled_date: newDate,
        scheduled_time: newTime,
      })
      await loadPosts()
    } catch (err) {
      console.error('Failed to reschedule post:', err)
      info.revert()
      setError('Failed to reschedule post')
    }
  }

  function handleEventClick(info) {
    const post = info.event.extendedProps
    setSelectedPost({ ...post, id: info.event.id })
  }

  async function handleDeletePost() {
    if (!selectedPost) return

    if (!confirm('Are you sure you want to remove this post from the calendar?')) {
      return
    }

    try {
      await deleteScheduledPost(selectedPost.id)
      setSelectedPost(null)
      await loadPosts()
    } catch (err) {
      console.error('Failed to delete post:', err)
      setError('Failed to delete post')
    }
  }

  async function handleStatusChange(newStatus) {
    if (!selectedPost) return

    try {
      await updateScheduledPost(selectedPost.id, { status: newStatus })
      setSelectedPost(null)
      await loadPosts()
    } catch (err) {
      console.error('Failed to update post status:', err)
      setError('Failed to update status')
    }
  }

  async function handleSaveEdit() {
    if (!selectedPost || !editedText.trim()) return

    try {
      setSaving(true)
      await updateScheduledPost(selectedPost.id, { post_text: editedText })
      setSelectedPost({ ...selectedPost, post_text: editedText })
      setIsEditing(false)
      await loadPosts()
    } catch (err) {
      console.error('Failed to save edit:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function startEditing() {
    setEditedText(selectedPost.post_text)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditedText('')
  }

  // Map content type to platform for scheduling
  function getplatformForContentType(contentType) {
    const mapping = {
      linkedin_post: 'linkedin',
      blog_post: 'blog',
      email_sequence: 'email',
      twitter_thread: 'twitter',
      executive_summary: 'other',
    }
    return mapping[contentType] || 'other'
  }

  async function handleQuickSchedule() {
    if (!quickSchedulePost || !quickScheduleDate) return

    try {
      setSaving(true)
      const platform = getplatformForContentType(quickSchedulePost.content_type)
      await createScheduledPost({
        account_id: account.id,
        content_id: quickSchedulePost.id,
        platform,
        scheduled_date: quickScheduleDate,
        scheduled_time: quickScheduleTime || null,
        post_text: quickSchedulePost.content_text,
        status: 'scheduled',
      })
      setQuickSchedulePost(null)
      setQuickScheduleDate('')
      setQuickScheduleTime('09:00')
      await loadAllData()
    } catch (err) {
      console.error('Failed to schedule content:', err)
      setError('Failed to schedule content')
    } finally {
      setSaving(false)
    }
  }

  function changeView(view) {
    setViewType(view)
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.changeView(view)
    }
  }

  function startEditingUnscheduled() {
    setEditedUnscheduledText(viewUnscheduledPost.content_text)
    setEditingUnscheduled(true)
  }

  function cancelEditingUnscheduled() {
    setEditingUnscheduled(false)
    setEditedUnscheduledText('')
  }

  async function handleSaveUnscheduledEdit() {
    if (!viewUnscheduledPost || !editedUnscheduledText.trim()) return

    try {
      setSaving(true)
      await updateGeneratedContent(viewUnscheduledPost.id, {
        content_text: editedUnscheduledText,
      })
      // Update local state
      setUnscheduledPosts(prev => prev.map(post =>
        post.id === viewUnscheduledPost.id
          ? { ...post, content_text: editedUnscheduledText }
          : post
      ))
      setViewUnscheduledPost(prev => ({ ...prev, content_text: editedUnscheduledText }))
      setEditingUnscheduled(false)
      setEditedUnscheduledText('')
    } catch (err) {
      console.error('Failed to save edit:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchiveUnscheduled() {
    if (!viewUnscheduledPost) return

    if (!confirm('Archive this content? It will be hidden from the calendar but can be viewed in Content History.')) {
      return
    }

    try {
      setSaving(true)
      await archiveContent(viewUnscheduledPost.id)
      // Remove from local state
      setUnscheduledPosts(prev => prev.filter(post => post.id !== viewUnscheduledPost.id))
      setViewUnscheduledPost(null)
    } catch (err) {
      console.error('Failed to archive content:', err)
      setError('Failed to archive content')
    } finally {
      setSaving(false)
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
            <p className="text-gray-600 mt-1">Plan and schedule your content publishing</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => changeView('dayGridMonth')}
                className={`px-3 py-1.5 text-sm ${
                  viewType === 'dayGridMonth'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => changeView('timeGridWeek')}
                className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                  viewType === 'timeGridWeek'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Generate Content
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm">
          {/* Content Type Legend */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 font-medium">Content:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center" style={{ backgroundColor: CONTENT_TYPE_CONFIG.linkedin_post.color.bg, color: CONTENT_TYPE_CONFIG.linkedin_post.color.border }}>in</span>
              <span className="text-gray-600">LinkedIn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center" style={{ backgroundColor: CONTENT_TYPE_CONFIG.blog_post.color.bg, color: CONTENT_TYPE_CONFIG.blog_post.color.border }}>B</span>
              <span className="text-gray-600">Blog</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center" style={{ backgroundColor: CONTENT_TYPE_CONFIG.email_sequence.color.bg, color: CONTENT_TYPE_CONFIG.email_sequence.color.border }}>E</span>
              <span className="text-gray-600">Email</span>
            </div>
          </div>
          {/* Status Legend */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 font-medium">Status:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.published.border }}></span>
              <span className="text-gray-600">Published</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.draft.border }}></span>
              <span className="text-gray-600">Draft</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.failed.border }}></span>
              <span className="text-gray-600">Failed</span>
            </div>
          </div>
        </div>

        {/* Main Layout: Calendar + Unscheduled Panel */}
        <div className="flex gap-6">
          {/* Calendar */}
          <div className={`card flex-1 ${showUnscheduled ? '' : 'w-full'}`}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={viewType}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              events={events}
              editable={true}
              droppable={true}
              eventDrop={handleEventDrop}
              eventClick={handleEventClick}
              height="auto"
              dayMaxEvents={3}
              eventDisplay="block"
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short',
              }}
            />
          </div>

          {/* Unscheduled Content Panel with Tabs */}
          <div className={`w-80 flex-shrink-0 ${showUnscheduled ? '' : 'hidden'}`}>
            <div className="card sticky top-4 p-0 overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Ready to Schedule</h3>
                <button
                  onClick={() => setShowUnscheduled(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Hide panel"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content Type Tabs */}
              {(() => {
                // Count items per content type
                const countsByType = unscheduledPosts.reduce((acc, item) => {
                  acc[item.content_type] = (acc[item.content_type] || 0) + 1
                  return acc
                }, {})

                const tabs = [
                  { id: 'linkedin_post', label: 'LinkedIn', icon: 'in' },
                  { id: 'blog_post', label: 'Blog', icon: 'B' },
                  { id: 'email_sequence', label: 'Email', icon: 'E' },
                ]

                return (
                  <div className="flex border-b border-gray-200">
                    {tabs.map(tab => {
                      const count = countsByType[tab.id] || 0
                      const typeConfig = CONTENT_TYPE_CONFIG[tab.id]
                      const isActive = activeContentTab === tab.id

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveContentTab(tab.id)}
                          className={`flex-1 py-2 px-1 text-center transition-colors relative ${
                            isActive
                              ? 'bg-white'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          style={isActive ? { borderBottom: `2px solid ${typeConfig.color.border}` } : {}}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                              style={{
                                backgroundColor: isActive ? typeConfig.color.border : typeConfig.color.bg,
                                color: isActive ? 'white' : typeConfig.color.border,
                              }}
                            >
                              {tab.icon}
                            </span>
                            <span className={`text-xs font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {count}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Tab Content */}
              <div className="p-3">
                {unscheduledPosts.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 mb-2">No unscheduled content</p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Generate more content
                    </button>
                  </div>
                ) : (
                  (() => {
                    // Filter items for the active tab
                    const filteredItems = unscheduledPosts.filter(item => item.content_type === activeContentTab)
                    const typeConfig = CONTENT_TYPE_CONFIG[activeContentTab] || CONTENT_TYPE_CONFIG.linkedin_post

                    if (filteredItems.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-500 mb-2">No {typeConfig.label.toLowerCase()} content ready</p>
                          <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Generate {typeConfig.label.toLowerCase()} content
                          </button>
                        </div>
                      )
                    }

                    // Group by source
                    const bySource = filteredItems.reduce((sources, item) => {
                      const sourceId = item.content_sources?.id || 'unknown'
                      const sourceTitle = item.content_sources?.title || item.content_sources?.original_filename || 'Untitled'
                      const key = `${sourceId}|${sourceTitle}`
                      if (!sources[key]) {
                        sources[key] = { sourceId, sourceTitle, items: [] }
                      }
                      sources[key].items.push(item)
                      return sources
                    }, {})

                    return (
                      <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                        {Object.entries(bySource).map(([key, group]) => (
                          <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Source Header */}
                            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-600 truncate flex-1">
                                {group.sourceTitle}
                              </span>
                              <button
                                onClick={() => navigate(`/content/${group.sourceId}`)}
                                className="text-xs text-primary-600 hover:text-primary-700 ml-2 flex-shrink-0"
                              >
                                View all
                              </button>
                            </div>
                            {/* Items */}
                            <div className="divide-y divide-gray-100">
                              {group.items.map((item, idx) => (
                                <div
                                  key={item.id}
                                  className="p-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-xs text-gray-400">
                                      {activeContentTab === 'email_sequence' && item.content_metadata?.subject
                                        ? item.content_metadata.subject.substring(0, 25) + (item.content_metadata.subject.length > 25 ? '...' : '')
                                        : `#${idx + 1}`}
                                    </span>
                                    {item.content_metadata?.linkedin_length && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${LINKEDIN_LENGTH_LABELS[item.content_metadata.linkedin_length]?.color || 'bg-gray-100 text-gray-600'}`}>
                                        {LINKEDIN_LENGTH_LABELS[item.content_metadata.linkedin_length]?.name}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className="text-sm text-gray-700 line-clamp-2 mb-2 cursor-pointer hover:text-gray-900"
                                    onClick={() => setViewUnscheduledPost(item)}
                                  >
                                    {item.content_text.substring(0, 100)}...
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setViewUnscheduledPost(item)}
                                      className="flex-1 text-xs text-gray-600 hover:text-gray-800 font-medium py-1 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                                    >
                                      View / Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setQuickSchedulePost(item)
                                        const tomorrow = new Date()
                                        tomorrow.setDate(tomorrow.getDate() + 1)
                                        setQuickScheduleDate(tomorrow.toISOString().split('T')[0])
                                      }}
                                      className="flex-1 text-xs text-primary-600 hover:text-primary-700 font-medium py-1 border border-primary-200 rounded hover:bg-primary-50 transition-colors"
                                    >
                                      Schedule
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle to show panel if hidden */}
        {!showUnscheduled && unscheduledPosts.length > 0 && (
          <button
            onClick={() => setShowUnscheduled(true)}
            className="fixed right-4 bottom-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {unscheduledPosts.length} Content Items Ready
          </button>
        )}

        {/* Empty State */}
        {posts.length === 0 && unscheduledPosts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No posts scheduled yet.</p>
            <p className="text-sm text-gray-400">
              Generate content from your dashboard, then add posts to the calendar.
            </p>
          </div>
        )}

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* Content Type Badge */}
                  {(() => {
                    const contentType = selectedPost.contentType || selectedPost.generated_content?.content_type || PLATFORM_TO_CONTENT_TYPE[selectedPost.platform] || 'linkedin_post'
                    const typeConfig = CONTENT_TYPE_CONFIG[contentType] || CONTENT_TYPE_CONFIG.linkedin_post
                    return (
                      <span
                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: typeConfig.color.border, color: 'white' }}
                        title={typeConfig.label}
                      >
                        {typeConfig.icon}
                      </span>
                    )
                  })()}
                  <h3 className="font-semibold text-gray-900">
                    {isEditing ? 'Edit Content' : 'Scheduled Content'}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[selectedPost.status]?.bg,
                      color: STATUS_COLORS[selectedPost.status]?.text,
                    }}
                  >
                    {selectedPost.status}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedPost(null)
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
                {/* Info Bar */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Scheduled for: {new Date(selectedPost.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {selectedPost.scheduled_time && ` at ${selectedPost.scheduled_time}`}
                    </p>
                    {selectedPost.generated_content?.content_source_id && (
                      <button
                        onClick={() => navigate(`/content/${selectedPost.generated_content.content_source_id}`)}
                        className="text-xs text-primary-600 hover:text-primary-700 mt-1 flex items-center gap-1"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View all content from this source
                      </button>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={startEditing}
                      className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Post
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full h-64 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Edit your post..."
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs ${editedText.length > 3000 ? 'text-red-500' : 'text-gray-400'}`}>
                        {editedText.length} characters
                        {editedText.length > 3000 && ' (LinkedIn limit: 3,000)'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEditing}
                          className="btn-secondary text-sm py-1.5 px-3"
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="btn-primary text-sm py-1.5 px-3"
                          disabled={saving || !editedText.trim()}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                      {selectedPost.post_text}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {selectedPost.post_text.length} characters
                    </p>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              {!isEditing && (
                <div className="p-4 border-t space-y-3">
                  {/* Copy to Clipboard */}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(selectedPost.post_text)
                      // Brief visual feedback could be added here
                    }}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy to Clipboard
                  </button>

                  {/* Status Actions */}
                  {selectedPost.status === 'scheduled' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange('draft')}
                        className="btn-secondary flex-1"
                      >
                        Move to Draft
                      </button>
                      <button
                        disabled
                        className="btn-primary flex-1 opacity-50 cursor-not-allowed"
                        title="LinkedIn integration coming soon"
                      >
                        Publish Now
                      </button>
                    </div>
                  )}
                  {selectedPost.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange('scheduled')}
                      className="btn-primary w-full"
                    >
                      Schedule Post
                    </button>
                  )}
                  {selectedPost.status === 'failed' && (
                    <button
                      onClick={() => handleStatusChange('scheduled')}
                      className="btn-primary w-full"
                    >
                      Retry
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={handleDeletePost}
                    className="w-full text-sm text-red-600 hover:text-red-700"
                  >
                    Remove from Calendar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Schedule Modal */}
        {quickSchedulePost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-4 border-b flex items-center gap-2">
                {/* Content Type Badge */}
                {(() => {
                  const typeConfig = CONTENT_TYPE_CONFIG[quickSchedulePost.content_type] || CONTENT_TYPE_CONFIG.linkedin_post
                  return (
                    <span
                      className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: typeConfig.color.border, color: 'white' }}
                      title={typeConfig.label}
                    >
                      {typeConfig.icon}
                    </span>
                  )
                })()}
                <h3 className="font-semibold text-gray-900">
                  Schedule {CONTENT_TYPE_CONFIG[quickSchedulePost.content_type]?.label || 'Content'}
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={quickScheduleDate}
                    onChange={(e) => setQuickScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time (optional)</label>
                  <input
                    type="time"
                    value={quickScheduleTime}
                    onChange={(e) => setQuickScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to schedule for any time that day</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {quickSchedulePost.content_text.substring(0, 150)}...
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {quickSchedulePost.content_text.length} characters
                  </p>
                </div>
              </div>
              <div className="p-4 border-t flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setQuickSchedulePost(null)
                    setQuickScheduleDate('')
                    setQuickScheduleTime('09:00')
                  }}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickSchedule}
                  className="btn-primary"
                  disabled={saving || !quickScheduleDate}
                >
                  {saving ? 'Scheduling...' : 'Add to Calendar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View/Edit Unscheduled Content Modal */}
        {viewUnscheduledPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* Content Type Badge */}
                  {(() => {
                    const typeConfig = CONTENT_TYPE_CONFIG[viewUnscheduledPost.content_type] || CONTENT_TYPE_CONFIG.linkedin_post
                    return (
                      <span
                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: typeConfig.color.border, color: 'white' }}
                        title={typeConfig.label}
                      >
                        {typeConfig.icon}
                      </span>
                    )
                  })()}
                  <h3 className="font-semibold text-gray-900">
                    {editingUnscheduled ? 'Edit Content' : (CONTENT_TYPE_CONFIG[viewUnscheduledPost.content_type]?.label || 'Content')}
                  </h3>
                  {viewUnscheduledPost.content_metadata?.linkedin_length && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${LINKEDIN_LENGTH_LABELS[viewUnscheduledPost.content_metadata.linkedin_length]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {LINKEDIN_LENGTH_LABELS[viewUnscheduledPost.content_metadata.linkedin_length]?.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setViewUnscheduledPost(null)
                    setEditingUnscheduled(false)
                    setEditedUnscheduledText('')
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
                {/* Source Info */}
                {viewUnscheduledPost.content_sources && (
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      From: {viewUnscheduledPost.content_sources.title || viewUnscheduledPost.content_sources.original_filename}
                    </p>
                    <button
                      onClick={() => navigate(`/content/${viewUnscheduledPost.content_sources.id}`)}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View all from source
                    </button>
                  </div>
                )}

                {editingUnscheduled ? (
                  <div>
                    <textarea
                      value={editedUnscheduledText}
                      onChange={(e) => setEditedUnscheduledText(e.target.value)}
                      className="w-full h-64 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Edit your post..."
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs ${editedUnscheduledText.length > 3000 ? 'text-red-500' : 'text-gray-400'}`}>
                        {editedUnscheduledText.length} characters
                        {editedUnscheduledText.length > 3000 && ' (LinkedIn limit: 3,000)'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                      {viewUnscheduledPost.content_text}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {viewUnscheduledPost.content_text.length} characters
                    </p>
                  </>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t space-y-3">
                {editingUnscheduled ? (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditingUnscheduled}
                      className="btn-secondary flex-1"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveUnscheduledEdit}
                      className="btn-primary flex-1"
                      disabled={saving || !editedUnscheduledText.trim()}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={startEditingUnscheduled}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(viewUnscheduledPost.content_text)
                        }}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setViewUnscheduledPost(null)
                        setQuickSchedulePost(viewUnscheduledPost)
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        setQuickScheduleDate(tomorrow.toISOString().split('T')[0])
                      }}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Add to Calendar
                    </button>
                    <button
                      onClick={handleArchiveUnscheduled}
                      disabled={saving}
                      className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5 py-1"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive (hide from calendar)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
