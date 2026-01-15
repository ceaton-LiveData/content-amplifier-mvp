import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Account operations
export async function getAccount(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // If no account exists, create one
    if (error.code === 'PGRST116') {
      return createAccountForUser(userId)
    }
    throw error
  }
  return data
}

export async function createAccountForUser(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAccount(userId, updates) {
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Content Sources operations
export async function createContentSource(accountId, sourceData) {
  const { data, error } = await supabase
    .from('content_sources')
    .insert({ account_id: accountId, ...sourceData })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getContentSource(id) {
  const { data, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function listContentSources(accountId) {
  const { data, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function deleteContentSource(id) {
  const { error } = await supabase
    .from('content_sources')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Content Generations operations
export async function createGeneration(generationData) {
  const { data, error } = await supabase
    .from('content_generations')
    .insert(generationData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGeneration(id, updates) {
  const { data, error } = await supabase
    .from('content_generations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getGeneration(id) {
  const { data, error } = await supabase
    .from('content_generations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function listGenerations(accountId) {
  const { data, error } = await supabase
    .from('content_generations')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Generated Content operations
export async function saveGeneratedContent(contentItems) {
  const { data, error } = await supabase
    .from('generated_content')
    .insert(contentItems)
    .select()

  if (error) throw error
  return data
}

export async function getGeneratedContent(generationId) {
  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('generation_id', generationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function listContentBySource(sourceId) {
  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('content_source_id', sourceId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateGeneratedContent(id, updates) {
  const { data, error } = await supabase
    .from('generated_content')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get a single content item by ID
export async function getGeneratedContentById(id) {
  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Create a revision of existing content
export async function createContentRevision(originalContent, revisedText, revisedMetadata = null) {
  // Calculate revision number
  const revisionNumber = (originalContent.revision_number || 0) + 1

  // Find the root original (if this is a revision of a revision)
  const rootOriginalId = originalContent.revision_of || originalContent.id

  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      generation_id: originalContent.generation_id,
      content_source_id: originalContent.content_source_id,
      account_id: originalContent.account_id,
      template_id: originalContent.template_id,
      content_type: originalContent.content_type,
      content_text: revisedText,
      content_metadata: revisedMetadata || originalContent.content_metadata,
      revision_of: rootOriginalId,
      revision_number: revisionNumber,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get all revisions of a piece of content
export async function getContentRevisions(contentId) {
  // First get the root original ID
  const original = await getGeneratedContentById(contentId)
  const rootId = original.revision_of || contentId

  // Get all content with this root ID (including the original)
  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .or(`id.eq.${rootId},revision_of.eq.${rootId}`)
    .order('revision_number', { ascending: true })

  if (error) throw error
  return data
}

// Get the original content for a revision
export async function getOriginalContent(contentId) {
  const content = await getGeneratedContentById(contentId)
  if (!content.revision_of) {
    return content // This is already the original
  }
  return getGeneratedContentById(content.revision_of)
}

// Template operations
export async function getTemplates(accountId) {
  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .or(`is_default.eq.true,account_id.eq.${accountId}`)

  if (error) throw error
  return data
}

export async function getTemplateByName(templateName) {
  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .eq('template_name', templateName)
    .eq('is_default', true)
    .single()

  if (error) throw error
  return data
}

// Usage tracking
export async function getUsageThisMonth(accountId) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('content_generations')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('status', 'complete')
    .gte('created_at', startOfMonth.toISOString())

  if (error) throw error
  return count || 0
}

export async function canProcessTranscript(accountId) {
  const account = await getAccount(accountId)
  const usage = await getUsageThisMonth(accountId)

  const limits = {
    free: 10,
    starter: 20,
    pro: 50,
    enterprise: 999999
  }

  const limit = limits[account.plan_tier] || 10
  return usage < limit
}

// Get distinct content types already generated for a source
export async function getExistingContentTypes(sourceId) {
  const { data, error } = await supabase
    .from('generated_content')
    .select('content_type')
    .eq('content_source_id', sourceId)

  if (error) throw error

  // Return unique content types
  const types = [...new Set(data.map(item => item.content_type))]
  return types
}

// API Usage Logging
export async function logApiUsage(usageData) {
  const { data, error } = await supabase
    .from('api_usage_logs')
    .insert(usageData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getApiCostThisMonth(accountId) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('estimated_cost')
    .eq('account_id', accountId)
    .gte('created_at', startOfMonth.toISOString())

  if (error) throw error

  const totalCost = data.reduce((sum, row) => sum + parseFloat(row.estimated_cost || 0), 0)
  return totalCost
}

export async function getApiUsageStats(accountId) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('input_tokens, output_tokens, estimated_cost, operation, content_type')
    .eq('account_id', accountId)
    .gte('created_at', startOfMonth.toISOString())

  if (error) throw error

  // Aggregate stats
  const stats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    callCount: data.length,
    byOperation: {},
    byContentType: {},
  }

  for (const row of data) {
    stats.totalInputTokens += row.input_tokens || 0
    stats.totalOutputTokens += row.output_tokens || 0
    stats.totalCost += parseFloat(row.estimated_cost || 0)

    // Group by operation
    if (row.operation) {
      if (!stats.byOperation[row.operation]) {
        stats.byOperation[row.operation] = { calls: 0, cost: 0 }
      }
      stats.byOperation[row.operation].calls++
      stats.byOperation[row.operation].cost += parseFloat(row.estimated_cost || 0)
    }

    // Group by content type
    if (row.content_type) {
      if (!stats.byContentType[row.content_type]) {
        stats.byContentType[row.content_type] = { calls: 0, cost: 0 }
      }
      stats.byContentType[row.content_type].calls++
      stats.byContentType[row.content_type].cost += parseFloat(row.estimated_cost || 0)
    }
  }

  return stats
}

// Admin functions (requires admin check in UI)
export async function adminGetApiStats() {
  const { data, error } = await supabase.rpc('admin_get_api_stats')
  if (error) throw error
  return data?.[0] || null
}

export async function adminGetDailyCosts(daysBack = 30) {
  const { data, error } = await supabase.rpc('admin_get_daily_costs', { days_back: daysBack })
  if (error) throw error
  return data || []
}

export async function adminGetUserStats() {
  const { data, error } = await supabase.rpc('admin_get_user_stats')
  if (error) throw error
  return data?.[0] || null
}

export async function adminGetTopUsersByCost(limit = 10) {
  const { data, error } = await supabase.rpc('admin_get_top_users_by_cost', { limit_count: limit })
  if (error) throw error
  return data || []
}

export async function adminGetRecentErrors(limit = 50) {
  const { data, error } = await supabase.rpc('admin_get_recent_errors', { limit_count: limit })
  if (error) throw error
  return data || []
}

export async function adminGetRecentApiUsage(limit = 100) {
  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ============================================================================
// SCHEDULED POSTS (Calendar) operations
// ============================================================================

export async function createScheduledPost(postData) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert(postData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateScheduledPost(id, updates) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteScheduledPost(id) {
  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getScheduledPost(id) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select(`
      *,
      generated_content (
        id,
        content_type,
        content_metadata
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function listScheduledPosts(accountId, startDate, endDate) {
  let query = supabase
    .from('scheduled_posts')
    .select(`
      *,
      generated_content (
        id,
        content_type,
        content_metadata,
        content_source_id
      )
    `)
    .eq('account_id', accountId)
    .order('scheduled_date', { ascending: true })

  if (startDate) {
    query = query.gte('scheduled_date', startDate)
  }
  if (endDate) {
    query = query.lte('scheduled_date', endDate)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getScheduledPostsForContent(contentId) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('content_id', contentId)
    .order('scheduled_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Get LinkedIn posts that haven't been scheduled yet
export async function getUnscheduledLinkedInPosts(accountId) {
  // First get all content_ids that are already scheduled
  const { data: scheduledData, error: scheduledError } = await supabase
    .from('scheduled_posts')
    .select('content_id')
    .eq('account_id', accountId)

  if (scheduledError) throw scheduledError

  const scheduledContentIds = scheduledData.map(s => s.content_id)

  // Get all LinkedIn posts for this account
  const { data: contentData, error: contentError } = await supabase
    .from('generated_content')
    .select(`
      *,
      content_sources!inner (
        id,
        account_id,
        title,
        original_filename
      )
    `)
    .eq('content_sources.account_id', accountId)
    .eq('content_type', 'linkedin_post')
    .order('created_at', { ascending: false })

  if (contentError) throw contentError

  // Filter out already scheduled posts
  const unscheduledPosts = contentData.filter(
    post => !scheduledContentIds.includes(post.id)
  )

  return unscheduledPosts
}

// Get all schedulable content (LinkedIn, Blog, Email) that hasn't been scheduled yet
// Filters out archived content and content that's already published
export async function getUnscheduledContent(accountId, contentTypes = ['linkedin_post', 'blog_post', 'email_sequence', 'single_email']) {
  // First get all content_ids that are already scheduled (any status)
  const { data: scheduledData, error: scheduledError } = await supabase
    .from('scheduled_posts')
    .select('content_id, status')
    .eq('account_id', accountId)

  if (scheduledError) throw scheduledError

  // Content IDs that are scheduled (exclude from "Ready to Schedule")
  const scheduledContentIds = scheduledData.map(s => s.content_id)

  // Get all content of specified types for this account, excluding archived
  const { data: contentData, error: contentError } = await supabase
    .from('generated_content')
    .select(`
      *,
      content_sources!inner (
        id,
        account_id,
        title,
        original_filename
      )
    `)
    .eq('content_sources.account_id', accountId)
    .in('content_type', contentTypes)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (contentError) throw contentError

  // Filter out already scheduled posts
  const unscheduledContent = contentData.filter(
    item => !scheduledContentIds.includes(item.id)
  )

  return unscheduledContent
}

// Archive content (soft delete - hides from views but preserves data)
export async function archiveContent(id) {
  const { data, error } = await supabase
    .from('generated_content')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Bulk archive multiple content items
export async function bulkArchiveContent(ids) {
  if (!ids || ids.length === 0) return []

  const { data, error } = await supabase
    .from('generated_content')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .in('id', ids)
    .select()

  if (error) throw error
  return data || []
}

// Unarchive content
export async function unarchiveContent(id) {
  const { data, error } = await supabase
    .from('generated_content')
    .update({
      is_archived: false,
      archived_at: null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get all content for history view (published and archived)
export async function getContentHistory(accountId, filters = {}) {
  // Build the base query
  let query = supabase
    .from('generated_content')
    .select(`
      *,
      content_sources!inner (
        id,
        account_id,
        title,
        original_filename
      ),
      scheduled_posts (
        id,
        status,
        scheduled_date,
        published_at
      )
    `)
    .eq('content_sources.account_id', accountId)

  // Apply filters
  if (filters.contentType) {
    query = query.eq('content_type', filters.contentType)
  }

  if (filters.archived === true) {
    query = query.eq('is_archived', true)
  } else if (filters.archived === false) {
    query = query.eq('is_archived', false)
  }

  // Order by most recent
  query = query.order('created_at', { ascending: false })

  // Apply limit if specified
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error

  // Post-process to add status info
  return data.map(item => {
    const scheduledPost = item.scheduled_posts?.[0]
    let status = 'unscheduled'
    if (item.is_archived) {
      status = 'archived'
    } else if (scheduledPost?.status === 'published') {
      status = 'published'
    } else if (scheduledPost) {
      status = scheduledPost.status
    }
    return {
      ...item,
      displayStatus: status,
      publishedAt: scheduledPost?.published_at,
      scheduledDate: scheduledPost?.scheduled_date,
    }
  })
}
