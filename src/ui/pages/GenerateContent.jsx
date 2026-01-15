import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { getContentSource, createGeneration, updateGeneration, saveGeneratedContent, getExistingContentTypes, logApiUsage } from '../../infrastructure/database/supabase'
import { generateWithCache } from '../../infrastructure/ai/claude'

const CONTENT_TYPES = [
  { id: 'linkedin_post', name: 'LinkedIn Posts', count: 5, defaultChecked: true, hasLengthOption: true },
  { id: 'blog_post', name: 'Blog Post', count: 1, defaultChecked: true },
  { id: 'email_sequence', name: 'Email Sequence', count: 5, defaultChecked: true },
  { id: 'twitter_thread', name: 'Twitter Thread', count: 1, defaultChecked: false },
  { id: 'executive_summary', name: 'Executive Summary', count: 1, defaultChecked: false },
]

const LINKEDIN_LENGTH_OPTIONS = [
  { id: 'short', name: 'Short', chars: '150-300', hint: 'Quick insights, hot takes' },
  { id: 'medium', name: 'Medium', chars: '1,000-1,500', hint: 'Stories + value (recommended)' },
  { id: 'long', name: 'Long', chars: '1,500-2,500', hint: 'Deep frameworks, case studies' },
]

const TONE_OPTIONS = [
  { id: 'formal', name: 'More formal than usual', description: 'Executive-level, business-oriented, structured' },
  { id: null, name: 'Match my brand voice', description: 'Exactly as your brand voice profile describes', default: true },
  { id: 'casual', name: 'More casual than usual', description: 'Conversational, approachable, uses contractions' },
  { id: 'technical', name: 'Technical/Data-focused', description: 'More metrics, technical depth, specific examples' },
]

export default function GenerateContent() {
  const { sourceId } = useParams()
  const { account } = useAuth()
  const navigate = useNavigate()

  const [source, setSource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const [selectedTypes, setSelectedTypes] = useState([])
  const [existingTypes, setExistingTypes] = useState([])
  const [selectedTone, setSelectedTone] = useState(null)
  const [linkedinLength, setLinkedinLength] = useState('medium')
  const [progress, setProgress] = useState({ current: 0, total: 0, currentType: '' })

  useEffect(() => {
    loadSource()
  }, [sourceId])

  async function loadSource() {
    try {
      const [sourceData, existingContentTypes] = await Promise.all([
        getContentSource(sourceId),
        getExistingContentTypes(sourceId)
      ])
      setSource(sourceData)
      setExistingTypes(existingContentTypes)

      // Pre-select types that haven't been generated yet
      const notYetGenerated = CONTENT_TYPES
        .filter(t => !existingContentTypes.includes(t.id))
        .map(t => t.id)
      setSelectedTypes(notYetGenerated.length > 0 ? notYetGenerated : [])
    } catch (err) {
      setError('Failed to load transcript')
    } finally {
      setLoading(false)
    }
  }

  function toggleType(typeId) {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    )
  }

  async function handleGenerate() {
    if (selectedTypes.length === 0) {
      setError('Please select at least one content type')
      return
    }

    setGenerating(true)
    setError(null)
    setProgress({ current: 0, total: selectedTypes.length, currentType: '' })

    try {
      // Create generation record
      const generation = await createGeneration({
        content_source_id: sourceId,
        account_id: account.id,
        selected_types: selectedTypes,
        tone_override: selectedTone,
        status: 'processing',
      })

      const brandVoice = account.brand_voice_profile || 'Write in a professional, engaging tone.'
      const allContent = []

      // Generate each content type
      for (let i = 0; i < selectedTypes.length; i++) {
        const typeId = selectedTypes[i]
        const typeInfo = CONTENT_TYPES.find(t => t.id === typeId)

        setProgress({
          current: i + 1,
          total: selectedTypes.length,
          currentType: typeInfo.name,
        })

        try {
          const { content, usage } = await generateContentForType(
            typeId,
            typeInfo.count,
            source.transcript_text,
            brandVoice,
            selectedTone,
            account.target_audience,
            account.words_to_avoid,
            source.source_type || 'transcript',
            { linkedinLength }
          )

          // Log API usage
          try {
            await logApiUsage({
              account_id: account.id,
              generation_id: generation.id,
              model: usage.model,
              operation: 'content_generation',
              content_type: typeId,
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              cache_creation_input_tokens: usage.cache_creation_input_tokens,
              cache_read_input_tokens: usage.cache_read_input_tokens,
              estimated_cost: usage.estimated_cost,
              request_time_ms: usage.request_time_ms,
              status: 'success',
            })
          } catch (logErr) {
            console.error('Failed to log API usage:', logErr)
            // Don't fail content generation if logging fails
          }

          // Save each piece of content
          for (const piece of content) {
            // Build metadata - include linkedin_length for LinkedIn posts
            const metadata = { ...piece.metadata }
            if (typeId === 'linkedin_post') {
              metadata.linkedin_length = linkedinLength
            }

            allContent.push({
              generation_id: generation.id,
              content_source_id: sourceId,
              account_id: account.id,
              content_type: typeId,
              content_text: piece.text,
              content_metadata: Object.keys(metadata).length > 0 ? metadata : null,
              tokens_used: usage.input_tokens + usage.output_tokens,
              generation_cost: usage.estimated_cost,
            })
          }
        } catch (err) {
          console.error(`Error generating ${typeId}:`, err)
          // Continue with other types even if one fails
        }
      }

      // Save all generated content
      if (allContent.length > 0) {
        await saveGeneratedContent(allContent)
      }

      // Update generation status
      await updateGeneration(generation.id, {
        status: 'complete',
        completed_at: new Date().toISOString(),
      })

      // Navigate to content library
      navigate(`/content/${sourceId}`)
    } catch (err) {
      setError(err.message)
      setGenerating(false)
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

  if (generating) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="card text-center py-12">
            <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating your content...</h2>
            <p className="text-gray-600 mb-4">
              {progress.currentType && `Creating ${progress.currentType}...`}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {progress.current} of {progress.total} content types
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
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

        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Content</h1>
          <p className="text-gray-600 mb-6">
            From: <span className="font-medium">{source?.title || source?.original_filename}</span>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Transcript Preview */}
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Transcript Preview</p>
            <p className="text-sm text-gray-600">
              {source?.transcript_text?.substring(0, 300)}...
            </p>
          </div>

          {/* Content Type Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">What would you like to generate?</h3>
            {existingTypes.length > 0 && (
              <p className="text-sm text-gray-500 mb-3">
                Content types marked with a checkmark have already been generated.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTENT_TYPES.map((type) => {
                const alreadyGenerated = existingTypes.includes(type.id)
                const isSelected = selectedTypes.includes(type.id)
                return (
                  <div key={type.id}>
                    <label
                      className={`
                        flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                        ${isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : alreadyGenerated
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                        ${type.hasLengthOption && isSelected ? 'rounded-b-none' : ''}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleType(type.id)}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900">{type.name}</span>
                        <span className="text-sm text-gray-500 ml-1">({type.count})</span>
                      </span>
                      {alreadyGenerated && (
                        <span className="flex items-center text-green-600" title="Already generated">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </label>
                    {/* LinkedIn length selector */}
                    {type.hasLengthOption && isSelected && (
                      <div className="border border-t-0 border-primary-500 bg-primary-50 rounded-b-lg p-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Post length:</p>
                        <div className="flex gap-2">
                          {LINKEDIN_LENGTH_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setLinkedinLength(opt.id)}
                              className={`
                                flex-1 px-2 py-1.5 text-xs rounded border transition-colors
                                ${linkedinLength === opt.id
                                  ? 'border-primary-600 bg-primary-600 text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                }
                              `}
                              title={opt.hint}
                            >
                              {opt.name}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          {LINKEDIN_LENGTH_OPTIONS.find(o => o.id === linkedinLength)?.hint}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tone</h3>
            <div className="space-y-2">
              {TONE_OPTIONS.map((tone) => (
                <label
                  key={tone.id || 'default'}
                  className={`
                    flex items-start p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedTone === tone.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="tone"
                    checked={selectedTone === tone.id}
                    onChange={() => setSelectedTone(tone.id)}
                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500 mt-0.5"
                  />
                  <span className="ml-3">
                    <span className="text-sm font-medium text-gray-900">{tone.name}</span>
                    <span className="text-sm text-gray-500 block">{tone.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={selectedTypes.length === 0}
              className="btn-primary"
            >
              Generate Content
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Source type labels for prompts
const SOURCE_TYPE_LABELS = {
  transcript: { name: 'transcript', verb: 'from', context: 'This is a transcript from a video, podcast, webinar, or interview.' },
  article: { name: 'article', verb: 'from', context: 'This is an existing article or blog post to repurpose into other formats.' },
  topic: { name: 'topic brief', verb: 'about', context: 'This is a topic description or outline. Expand on the ideas and create original content based on the topic.' },
  notes: { name: 'notes', verb: 'from', context: 'These are meeting notes or research findings. Transform the raw information into polished content.' },
  other: { name: 'content', verb: 'from', context: 'Transform this source material into the requested content format.' },
}

// LinkedIn length configurations
const LINKEDIN_LENGTH_CONFIG = {
  short: { chars: '150-300', description: 'Quick insight or hot take' },
  medium: { chars: '1,000-1,500', description: 'Story with value and takeaway' },
  long: { chars: '1,500-2,500', description: 'Deep framework or case study' },
}

// Helper function to generate content for a specific type
async function generateContentForType(typeId, count, sourceText, brandVoice, toneOverride, targetAudience, wordsToAvoid, sourceType = 'transcript', options = {}) {
  const { linkedinLength = 'medium' } = options

  const toneInstruction = toneOverride === 'formal'
    ? 'Use a more formal, executive-level tone than usual.'
    : toneOverride === 'casual'
    ? 'Use a more casual, conversational tone than usual.'
    : toneOverride === 'technical'
    ? 'Focus on technical details, data, and specific metrics.'
    : ''

  const sourceInfo = SOURCE_TYPE_LABELS[sourceType] || SOURCE_TYPE_LABELS.other
  const sourceLabel = sourceInfo.name.toUpperCase()

  const lengthConfig = LINKEDIN_LENGTH_CONFIG[linkedinLength]

  const prompts = {
    linkedin_post: `Generate ${count} LinkedIn posts ${sourceInfo.verb} the following ${sourceInfo.name}.

FORMAT RULES:
- Length: ${lengthConfig.chars} characters (${lengthConfig.description})
- First 2-3 lines = hook (appears before "see more" fold - must grab attention)
- 1-2 sentences per paragraph MAX
- Line break between EVERY thought
- PLAIN TEXT only - no markdown, no hashtags in body

HOOK (vary these across posts):
- Contrarian: "Unpopular opinion:" / "Stop doing X" / "Most people get X wrong"
- Vulnerable: "I failed at X..." / "I made a $X mistake..."
- Data: "I analyzed X and found..." / specific metrics from source
- Bold claim: "The X no one talks about" / "This changed how I..."

STRUCTURE: Hook → Story/proof → Lesson → Specific CTA

CTA (must be specific, not vague):
✓ "Which resonates most - 1, 2, or 3?"
✓ "What would you add to this?"
✓ "Am I wrong here? Change my mind"
✗ NEVER use "Let me know what you think" or "Share your thoughts"

AVOID: "I'm excited to announce", "I'm humbled to share", walls of text, generic advice

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

${sourceLabel}:
${sourceText.substring(0, 8000)}

Generate exactly ${count} posts with variety in hooks. Format: "---POST N---" separator.`,

    blog_post: `Write a blog post based on the following ${sourceInfo.name}. The post should:
- Be 800-1200 words
- Have a compelling title
- Include an introduction that hooks the reader
- Be organized with clear sections/headers
- Include specific examples and insights ${sourceInfo.verb} the ${sourceInfo.name}
- End with a conclusion and call-to-action

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

${sourceLabel}:
${sourceText.substring(0, 12000)}

Format: Start with the title on the first line, then the content.`,

    email_sequence: `Create a ${count}-email nurture sequence based on the following ${sourceInfo.name}. Each email should:
- Be 100-150 words
- Have a compelling subject line
- Build on the previous email
- Include one key insight ${sourceInfo.verb} the ${sourceInfo.name}
- Have a clear call-to-action
- Write in PLAIN TEXT only - no markdown formatting (no #, **, *, or other markup)

The sequence should educate the reader progressively.

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

${sourceLabel}:
${sourceText.substring(0, 8000)}

Format each email with "---EMAIL N---" separator, then "Subject: [subject line]" on the next line, followed by the email body.`,

    twitter_thread: `Create a Twitter/X thread based on the following ${sourceInfo.name}. The thread should:
- Have 8-12 tweets
- Start with a hook tweet that grabs attention
- Each tweet should be under 280 characters
- Include specific insights and takeaways
- End with a summary or call-to-action
- Use thread numbering (1/, 2/, etc.)
- Write in PLAIN TEXT only - no markdown formatting (no #, **, *, or other markup)

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

${sourceLabel}:
${sourceText.substring(0, 6000)}

Format each tweet on its own line, numbered.`,

    executive_summary: `Write an executive summary based on the following ${sourceInfo.name}. The summary should:
- Be 250-400 words
- Start with the main thesis/key takeaway
- Include 3-5 key points
- Be written for busy executives
- Focus on actionable insights and business implications
- End with recommendations or next steps
- Write in PLAIN TEXT only - no markdown formatting (no #, **, *, or other markup)
- Use line breaks to separate sections, not headers

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

${sourceLabel}:
${sourceText.substring(0, 10000)}`,
  }

  const systemPrompt = `You are an expert content creator. Your job is to transform source content into engaging, on-brand content.

SOURCE TYPE: ${sourceInfo.name}
${sourceInfo.context}

BRAND VOICE:
${brandVoice}

IMPORTANT - PLAIN TEXT FORMAT:
Unless creating a blog post, write all content in plain text without markdown formatting. Do not use # for headers, ** for bold, * for italics, or any other markdown syntax. The content will be copied directly to platforms like LinkedIn and email where markdown does not render.

IMPORTANT - FACT VERIFICATION:
When the content includes statistics, study results, specific claims, or data points that would benefit from a source citation, add [VERIFY: brief description] immediately after the claim. This helps the user know what needs fact-checking or source links before publishing.

Examples:
- "Studies show 73% of hospitals..." → "Studies show 73% of hospitals... [VERIFY: hospital statistic - add source]"
- "Research from Harvard indicates..." → "Research from Harvard indicates... [VERIFY: Harvard research citation needed]"
- "Industry experts predict..." → "Industry experts predict... [VERIFY: which experts/source]"

Only flag claims that genuinely need verification - don't flag obvious statements, opinions, or general advice. The goal is to help the user publish accurate, well-sourced content.

Always maintain the brand voice while creating content. Be specific, use examples from the source content, and create content that provides real value to readers.`

  const { text, usage } = await generateWithCache(prompts[typeId], systemPrompt)

  // Parse the response based on content type
  const content = parseResponse(typeId, text, count)
  return { content, usage }
}

function parseResponse(typeId, response, expectedCount) {
  const results = []

  if (typeId === 'linkedin_post') {
    const posts = response.split(/---POST \d+---/).filter(p => p.trim())
    for (const post of posts) {
      results.push({ text: post.trim() })
    }
  } else if (typeId === 'email_sequence') {
    const emails = response.split(/---EMAIL \d+---/).filter(e => e.trim())
    for (const email of emails) {
      const lines = email.trim().split('\n')
      const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'))
      const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, '') : ''
      const body = lines.filter(l => !l.toLowerCase().startsWith('subject:')).join('\n').trim()
      results.push({
        text: body,
        metadata: { subject }
      })
    }
  } else if (typeId === 'twitter_thread') {
    const tweets = response.split('\n').filter(t => t.trim() && /^\d+[\/\.]/.test(t.trim()))
    for (const tweet of tweets) {
      results.push({ text: tweet.replace(/^\d+[\/\.]\s*/, '').trim() })
    }
    // If parsing failed, treat whole response as one piece
    if (results.length === 0) {
      results.push({ text: response.trim() })
    }
  } else {
    // blog_post, executive_summary - single piece
    results.push({ text: response.trim() })
  }

  return results
}
