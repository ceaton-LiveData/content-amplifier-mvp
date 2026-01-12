import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { getContentSource, createGeneration, updateGeneration, saveGeneratedContent } from '../../infrastructure/database/supabase'
import { generateWithCache } from '../../infrastructure/ai/claude'

const CONTENT_TYPES = [
  { id: 'linkedin_post', name: 'LinkedIn Posts', count: 5, defaultChecked: true },
  { id: 'blog_post', name: 'Blog Post', count: 1, defaultChecked: true },
  { id: 'email_sequence', name: 'Email Sequence', count: 5, defaultChecked: true },
  { id: 'twitter_thread', name: 'Twitter Thread', count: 1, defaultChecked: false },
  { id: 'executive_summary', name: 'Executive Summary', count: 1, defaultChecked: false },
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

  const [selectedTypes, setSelectedTypes] = useState(
    CONTENT_TYPES.filter(t => t.defaultChecked).map(t => t.id)
  )
  const [selectedTone, setSelectedTone] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, currentType: '' })

  useEffect(() => {
    loadSource()
  }, [sourceId])

  async function loadSource() {
    try {
      const data = await getContentSource(sourceId)
      setSource(data)
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
          const content = await generateContentForType(
            typeId,
            typeInfo.count,
            source.transcript_text,
            brandVoice,
            selectedTone,
            account.target_audience,
            account.words_to_avoid
          )

          // Save each piece of content
          for (const piece of content) {
            allContent.push({
              generation_id: generation.id,
              content_source_id: sourceId,
              account_id: account.id,
              content_type: typeId,
              content_text: piece.text,
              content_metadata: piece.metadata || null,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTENT_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`
                    flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedTypes.includes(type.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.id)}
                    onChange={() => toggleType(type.id)}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-3">
                    <span className="text-sm font-medium text-gray-900">{type.name}</span>
                    <span className="text-sm text-gray-500 ml-1">({type.count})</span>
                  </span>
                </label>
              ))}
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

// Helper function to generate content for a specific type
async function generateContentForType(typeId, count, transcript, brandVoice, toneOverride, targetAudience, wordsToAvoid) {
  const toneInstruction = toneOverride === 'formal'
    ? 'Use a more formal, executive-level tone than usual.'
    : toneOverride === 'casual'
    ? 'Use a more casual, conversational tone than usual.'
    : toneOverride === 'technical'
    ? 'Focus on technical details, data, and specific metrics.'
    : ''

  const prompts = {
    linkedin_post: `Generate ${count} LinkedIn posts based on the following transcript. Each post should:
- Be 150-200 words
- Start with an attention-grabbing hook
- Include a specific insight or data point from the transcript
- End with a question or call-to-action to drive engagement
- Use short paragraphs (1-3 sentences each)

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

TRANSCRIPT:
${transcript.substring(0, 8000)}

Generate exactly ${count} posts. Format each post with "---POST ${'{'}N{'}'}---" separator where N is the post number (1, 2, 3, etc).`,

    blog_post: `Write a blog post based on the following transcript. The post should:
- Be 800-1200 words
- Have a compelling title
- Include an introduction that hooks the reader
- Be organized with clear sections/headers
- Include specific examples and insights from the transcript
- End with a conclusion and call-to-action

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

TRANSCRIPT:
${transcript.substring(0, 12000)}

Format: Start with the title on the first line, then the content.`,

    email_sequence: `Create a ${count}-email nurture sequence based on the following transcript. Each email should:
- Be 100-150 words
- Have a compelling subject line
- Build on the previous email
- Include one key insight from the transcript
- Have a clear call-to-action

The sequence should educate the reader progressively.

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

TRANSCRIPT:
${transcript.substring(0, 8000)}

Format each email with "---EMAIL ${'{'}N{'}'}---" separator, then "Subject: [subject line]" on the next line, followed by the email body.`,

    twitter_thread: `Create a Twitter/X thread based on the following transcript. The thread should:
- Have 8-12 tweets
- Start with a hook tweet that grabs attention
- Each tweet should be under 280 characters
- Include specific insights and takeaways
- End with a summary or call-to-action
- Use thread numbering (1/, 2/, etc.)

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

TRANSCRIPT:
${transcript.substring(0, 6000)}

Format each tweet on its own line, numbered.`,

    executive_summary: `Write an executive summary based on the following transcript. The summary should:
- Be 250-400 words
- Start with the main thesis/key takeaway
- Include 3-5 key points
- Be written for busy executives
- Focus on actionable insights and business implications
- End with recommendations or next steps

${toneInstruction}
${targetAudience ? `Target audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Avoid these words/phrases: ${wordsToAvoid}` : ''}

TRANSCRIPT:
${transcript.substring(0, 10000)}`,
  }

  const systemPrompt = `You are an expert content creator. Your job is to transform transcripts into engaging, on-brand content.

BRAND VOICE:
${brandVoice}

Always maintain this brand voice while creating content. Be specific, use examples from the transcript, and create content that provides real value to readers.`

  const response = await generateWithCache(prompts[typeId], systemPrompt)

  // Parse the response based on content type
  return parseResponse(typeId, response, count)
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
