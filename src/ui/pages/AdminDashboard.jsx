import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import {
  adminGetApiStats,
  adminGetDailyCosts,
  adminGetUserStats,
  adminGetTopUsersByCost,
  adminGetRecentErrors,
  adminGetRecentApiUsage,
} from '../../infrastructure/database/supabase'

// Admin email whitelist - configured via environment variable or hardcoded
// Set VITE_ADMIN_EMAILS as comma-separated list in .env: "admin@example.com,other@example.com"
const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS
  ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map(e => e.trim())
  : [
      // Fallback hardcoded list
      'ceaton@livedata.com',
    ]

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Data states
  const [apiStats, setApiStats] = useState(null)
  const [dailyCosts, setDailyCosts] = useState([])
  const [userStats, setUserStats] = useState(null)
  const [topUsers, setTopUsers] = useState([])
  const [recentErrors, setRecentErrors] = useState([])
  const [recentUsage, setRecentUsage] = useState([])

  // Check if user is admin
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
      return
    }
    loadData()
  }, [user, isAdmin])

  async function loadData() {
    try {
      setLoading(true)
      const [stats, costs, users, top, errors, usage] = await Promise.all([
        adminGetApiStats(),
        adminGetDailyCosts(30),
        adminGetUserStats(),
        adminGetTopUsersByCost(10),
        adminGetRecentErrors(50),
        adminGetRecentApiUsage(100),
      ])

      setApiStats(stats)
      setDailyCosts(costs)
      setUserStats(users)
      setTopUsers(top)
      setRecentErrors(errors)
      setRecentUsage(usage)
    } catch (err) {
      console.error('Admin data load error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You do not have admin access.</p>
        </div>
      </Layout>
    )
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">System monitoring and analytics</p>
          </div>
          <button onClick={loadData} className="btn-secondary text-sm">
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'costs', 'users', 'errors', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Cost Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Cost Today"
                value={`$${(apiStats?.cost_today || 0).toFixed(4)}`}
                subtitle="API spend"
              />
              <StatCard
                title="Cost This Week"
                value={`$${(apiStats?.cost_this_week || 0).toFixed(4)}`}
                subtitle="Last 7 days"
              />
              <StatCard
                title="Cost This Month"
                value={`$${(apiStats?.cost_this_month || 0).toFixed(4)}`}
                subtitle="Current month"
              />
              <StatCard
                title="Total Cost"
                value={`$${(apiStats?.total_cost || 0).toFixed(4)}`}
                subtitle="All time"
              />
            </div>

            {/* User & Content Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <StatCard
                title="Total Users"
                value={userStats?.total_users || 0}
              />
              <StatCard
                title="With Brand Voice"
                value={userStats?.users_with_brand_voice || 0}
              />
              <StatCard
                title="Transcripts"
                value={userStats?.total_transcripts || 0}
              />
              <StatCard
                title="Generations"
                value={userStats?.total_generations || 0}
              />
              <StatCard
                title="Content Pieces"
                value={userStats?.total_content_pieces || 0}
              />
            </div>

            {/* Token Usage */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage (All Time)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Input Tokens</p>
                  <p className="text-xl font-semibold">{(apiStats?.total_input_tokens || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Output Tokens</p>
                  <p className="text-xl font-semibold">{(apiStats?.total_output_tokens || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total API Calls</p>
                  <p className="text-xl font-semibold">{(apiStats?.total_calls || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="space-y-6">
            {/* Daily Costs Table */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Cost Breakdown (Last 30 Days)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">API Calls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dailyCosts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-gray-500">No data yet</td>
                      </tr>
                    ) : (
                      dailyCosts.map((row) => (
                        <tr key={row.day}>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.day}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">${parseFloat(row.cost).toFixed(4)}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-500">{row.calls}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Users by Cost */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Users by Cost</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Calls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No data yet</td>
                      </tr>
                    ) : (
                      topUsers.map((user) => (
                        <tr key={user.account_id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {user.user_id ? user.user_id.slice(0, 8) + '...' : 'Unknown'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.plan_tier === 'free' ? 'bg-gray-100 text-gray-700' :
                              user.plan_tier === 'starter' ? 'bg-blue-100 text-blue-700' :
                              user.plan_tier === 'pro' ? 'bg-purple-100 text-purple-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {user.plan_tier}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">${parseFloat(user.total_cost).toFixed(4)}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-500">{user.total_calls}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{userStats?.total_users || 0}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{userStats?.users_with_brand_voice || 0}</p>
                <p className="text-sm text-gray-500">With Brand Voice</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{userStats?.total_transcripts || 0}</p>
                <p className="text-sm text-gray-500">Transcripts</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{userStats?.total_generations || 0}</p>
                <p className="text-sm text-gray-500">Generations</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{userStats?.total_content_pieces || 0}</p>
                <p className="text-sm text-gray-500">Content Pieces</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
            {recentErrors.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No errors recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentErrors.map((err) => (
                      <tr key={err.id}>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(err.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {err.user_id ? err.user_id.slice(0, 8) + '...' : 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{err.operation}</td>
                        <td className="px-4 py-2 text-sm text-red-600">{err.error_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent API Usage (Last 100)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content Type</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">In</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Out</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Time (ms)</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentUsage.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-center text-gray-500">No API calls recorded yet</td>
                    </tr>
                  ) : (
                    recentUsage.map((log) => (
                      <tr key={log.id}>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{log.operation}</td>
                        <td className="px-3 py-2 text-gray-500">{log.content_type || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{log.input_tokens?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{log.output_tokens?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-900">${parseFloat(log.estimated_cost).toFixed(5)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{log.request_time_ms}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
