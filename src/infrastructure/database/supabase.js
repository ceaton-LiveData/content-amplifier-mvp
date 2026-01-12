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
