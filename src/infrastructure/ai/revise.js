import { generateWithCache } from './claude'
import { createContentRevision, getGeneratedContentById, logApiUsage } from '../database/supabase'

// Revise prompt that polishes content while preserving voice and intent
function getRevisePrompt(contentType, brandVoice, userGuidance = '') {
  const basePrompt = `You are a content editor. Polish the following ${contentType} content with a LIGHT TOUCH.

BRAND VOICE:
${brandVoice || 'Professional and helpful'}

YOUR TASK:
- Tighten verbose sentences
- Improve hooks/openings if weak
- Strengthen CTAs if unclear
- Fix awkward phrasing
- Maintain the original message and structure

DO NOT:
- Change the core message or argument
- Add new sections or significantly expand
- Remove key points
- Change the overall tone drastically
- Add emojis unless the original had them

${userGuidance ? `USER GUIDANCE:\n${userGuidance}\n\n` : ''}
Return ONLY the polished content, no explanations.

ORIGINAL CONTENT:
`

  return basePrompt
}

// Revise content with AI polish
export async function reviseContent(contentId, accountId, brandVoice, userGuidance = '', onProgress = null) {
  // Get the original content
  const original = await getGeneratedContentById(contentId)
  if (!original) {
    throw new Error('Content not found')
  }

  // Set progress
  if (onProgress) onProgress('Polishing content...')

  // Build the prompt
  const prompt = getRevisePrompt(
    formatContentType(original.content_type),
    brandVoice,
    userGuidance
  ) + original.content_text

  // Call Claude
  const { text: revisedText, usage } = await generateWithCache(
    prompt,
    'You are a skilled content editor. Focus on polish, not rewriting.'
  )

  // Log API usage
  try {
    await logApiUsage({
      account_id: accountId,
      model: usage.model || 'claude-sonnet-4-20250514',
      operation: 'content_revision',
      content_type: original.content_type,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
      cache_read_input_tokens: usage.cache_read_input_tokens || 0,
      estimated_cost: usage.estimated_cost || 0,
      request_time_ms: usage.request_time_ms || 0,
      status: 'success',
    })
  } catch (logErr) {
    console.error('Failed to log API usage:', logErr)
  }

  // Create the revision record
  const revision = await createContentRevision(original, revisedText.trim())

  return {
    original,
    revision,
    usage,
  }
}

// Format content type for display in prompts
function formatContentType(contentType) {
  const labels = {
    linkedin_post: 'LinkedIn post',
    blog_post: 'blog post',
    email_sequence: 'email',
    single_email: 'email',
    twitter_thread: 'Twitter thread',
    executive_summary: 'executive summary',
  }
  return labels[contentType] || contentType
}
