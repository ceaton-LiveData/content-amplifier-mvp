import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { listContentSources, getUsageThisMonth } from '../../infrastructure/database/supabase'

export default function Dashboard() {
  const { account } = useAuth()
  const [sources, setSources] = useState([])
  const [usage, setUsage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const usageLimit = {
    free: 10,
    starter: 20,
    pro: 50,
    enterprise: 999999
  }[account?.plan_tier || 'free']

  useEffect(() => {
    if (account) {
      loadData()
    }
  }, [account])

  async function loadData() {
    try {
      setLoading(true)
      const [sourcesData, usageCount] = await Promise.all([
        listContentSources(account.id),
        getUsageThisMonth(account.id)
      ])
      setSources(sourcesData || [])
      setUsage(usageCount)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Transform your content into multiple formats</p>
          </div>
          <Link to="/upload" className="btn-primary">
            Add Content
          </Link>
        </div>

        {/* Usage Widget */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Generations this month</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {usage} / {usageLimit}
              </p>
            </div>
            <div className="w-32">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((usage / usageLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Brand Voice Status */}
        {!account?.brand_voice_profile ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Set up your brand voice</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Configure your brand voice to generate content that matches your style.
                </p>
                <Link to="/onboarding" className="text-sm font-medium text-yellow-800 hover:text-yellow-900 mt-2 inline-block">
                  Set up now &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Brand Voice</h3>
                <p className="text-sm text-gray-700 mt-1">
                  Your brand voice profile is configured.
                </p>
              </div>
              <Link to="/onboarding" className="btn-secondary text-sm">
                Update Brand Voice
              </Link>
            </div>
          </div>
        )}

        {/* Content Sources List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Content</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              {error}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No content yet</h3>
              <p className="mt-2 text-gray-500">Add your first content source to get started.</p>
              <Link to="/upload" className="btn-primary mt-4 inline-block">
                Add Content
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <Link
                  key={source.id}
                  to={`/content/${source.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {source.title || source.original_filename}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          source.source_type === 'article' ? 'bg-blue-100 text-blue-700' :
                          source.source_type === 'topic' ? 'bg-purple-100 text-purple-700' :
                          source.source_type === 'notes' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {source.source_type === 'article' ? 'Article' :
                           source.source_type === 'topic' ? 'Topic' :
                           source.source_type === 'notes' ? 'Notes' :
                           'Transcript'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(source.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
