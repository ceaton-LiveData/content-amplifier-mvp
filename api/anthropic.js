import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function readEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}
  const content = fs.readFileSync(envPath, 'utf8')
  const lines = content.split(/\r?\n/)
  const vars = {}

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const parts = line.split('=', 2)
    if (parts.length !== 2) continue
    const key = parts[0].trim()
    const value = parts[1].trim()
    if (key) vars[key] = value
  }

  return vars
}

function resolveEnv() {
  const fileVars = readEnvFile()
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fileVars.SUPABASE_URL || fileVars.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileVars.SUPABASE_SERVICE_ROLE_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY || fileVars.ANTHROPIC_API_KEY

  return {
    supabaseUrl,
    serviceRoleKey,
    anthropicKey,
  }
}

const PRICING = {
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  default: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
}

const RATE_LIMITS = {
  free: { perMinute: 10, perDay: 200 },
  starter: { perMinute: 30, perDay: 1000 },
  pro: { perMinute: 60, perDay: 3000 },
  enterprise: { perMinute: 300, perDay: 20000 },
  default: { perMinute: 10, perDay: 200 },
}

function calculateCost(usage, model) {
  const pricing = PRICING[model] || PRICING.default
  const inputCost = (usage.input_tokens || 0) * pricing.input / 1_000_000
  const outputCost = (usage.output_tokens || 0) * pricing.output / 1_000_000
  const cacheWriteCost = (usage.cache_creation_input_tokens || 0) * pricing.cacheWrite / 1_000_000
  const cacheReadCost = (usage.cache_read_input_tokens || 0) * pricing.cacheRead / 1_000_000
  return inputCost + outputCost + cacheWriteCost + cacheReadCost
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { supabaseUrl, serviceRoleKey, anthropicKey } = resolveEnv()

    if (!supabaseUrl || !serviceRoleKey || !anthropicKey) {
      const missing = [
        !supabaseUrl && 'SUPABASE_URL (or VITE_SUPABASE_URL)',
        !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
        !anthropicKey && 'ANTHROPIC_API_KEY',
      ].filter(Boolean)
      return res.status(500).json({ error: 'Server configuration error', missing })
    }

    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }

    const payload = body?.payload
    const logContext = body?.logContext || {}

    if (!payload || !payload.model || !payload.messages) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, plan_tier')
      .eq('user_id', userData.user.id)
      .single()

    if (accountError || !account) {
      return res.status(500).json({ error: 'Account lookup failed' })
    }

    const plan = account.plan_tier || 'default'
    const limits = RATE_LIMITS[plan] || RATE_LIMITS.default

    const minuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ count: minuteCount, error: minuteError }, { count: dayCount, error: dayError }] = await Promise.all([
      supabase
        .from('api_usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', minuteAgo),
      supabase
        .from('api_usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', dayAgo),
    ])

    if (minuteError || dayError) {
      return res.status(503).json({ error: 'Rate limit check unavailable' })
    }

    if ((minuteCount || 0) >= limits.perMinute) {
      return res.status(429).json({ error: 'Rate limit exceeded (per minute)' })
    }

    if ((dayCount || 0) >= limits.perDay) {
      return res.status(429).json({ error: 'Rate limit exceeded (per day)' })
    }

    const startTime = Date.now()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    })

    const requestTimeMs = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData?.error?.message || 'Claude API error'

      try {
        await supabase.from('api_usage_logs').insert({
          account_id: account.id,
          generation_id: logContext.generationId || null,
          model: payload.model,
          operation: logContext.operation || 'unknown',
          content_type: logContext.contentType || null,
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          estimated_cost: 0,
          request_time_ms: requestTimeMs,
          status: 'error',
          error_message: errorMessage,
        })
      } catch {
        // Ignore logging errors
      }

      return res.status(502).json({ error: errorMessage })
    }

    const data = await response.json()

    const usage = {
      model: payload.model,
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
      cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
      cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0,
      request_time_ms: requestTimeMs,
      estimated_cost: calculateCost(data.usage || {}, payload.model),
    }

    try {
      await supabase.from('api_usage_logs').insert({
        account_id: account.id,
        generation_id: logContext.generationId || null,
        model: payload.model,
        operation: logContext.operation || 'unknown',
        content_type: logContext.contentType || null,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        estimated_cost: usage.estimated_cost,
        request_time_ms: usage.request_time_ms,
        status: 'success',
      })
    } catch {
      // Ignore logging errors
    }

    const text = data?.content?.[0]?.text || ''
    return res.status(200).json({ text, usage })
  } catch (error) {
    console.error('Anthropic proxy error:', error)
    return res.status(500).json({ error: error?.message || 'Server error' })
  }
}
