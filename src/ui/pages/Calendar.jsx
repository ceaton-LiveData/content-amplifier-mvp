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
} from '../../infrastructure/database/supabase'

const STATUS_COLORS = {
  draft: { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
  scheduled: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  published: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  failed: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  cancelled: { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280' },
}

export default function Calendar() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const calendarRef = useRef(null)

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [viewType, setViewType] = useState('dayGridMonth')

  useEffect(() => {
    if (account?.id) {
      loadPosts()
    }
  }, [account?.id])

  async function loadPosts() {
    try {
      setLoading(true)
      const data = await listScheduledPosts(account.id)
      setPosts(data)
    } catch (err) {
      console.error('Failed to load scheduled posts:', err)
      setError('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  // Convert posts to FullCalendar events
  const events = posts.map(post => {
    const colors = STATUS_COLORS[post.status] || STATUS_COLORS.scheduled
    return {
      id: post.id,
      title: post.post_text.substring(0, 50) + (post.post_text.length > 50 ? '...' : ''),
      start: post.scheduled_time
        ? `${post.scheduled_date}T${post.scheduled_time}`
        : post.scheduled_date,
      allDay: !post.scheduled_time,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        ...post,
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

  function changeView(view) {
    setViewType(view)
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.changeView(view)
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
            <p className="text-gray-600 mt-1">Plan and schedule your LinkedIn posts</p>
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
              Add Content
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
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.scheduled.border }}></span>
            <span className="text-gray-600">Scheduled</span>
          </div>
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

        {/* Calendar */}
        <div className="card">
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

        {/* Empty State */}
        {posts.length === 0 && (
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
                  <h3 className="font-semibold text-gray-900">Scheduled Post</h3>
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
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">
                    Scheduled for: {new Date(selectedPost.scheduled_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {selectedPost.scheduled_time && ` at ${selectedPost.scheduled_time}`}
                  </p>
                </div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedPost.post_text}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedPost.post_text.length} characters
                </p>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t space-y-3">
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
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
