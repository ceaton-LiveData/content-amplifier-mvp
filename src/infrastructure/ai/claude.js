/**
 * Claude AI Provider
 *
 * NOTE: For MVP, we're calling Claude API from the client.
 * In production, move this to a Supabase Edge Function to protect the API key.
 */

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

/**
 * Generate content using Claude API
 * @param {string} prompt - The user prompt
 * @param {object} options - Generation options
 * @returns {Promise<string>} - Generated text
 */
export async function generate(prompt, options = {}) {
  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 2000,
    systemPrompt = '',
    temperature = 1,
  } = options

  const messages = [
    { role: 'user', content: prompt }
  ]

  const body = {
    model,
    max_tokens: maxTokens,
    messages,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  if (temperature !== 1) {
    body.temperature = temperature
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to generate content')
  }

  const data = await response.json()
  return data.content[0].text
}

/**
 * Generate with prompt caching for brand voice
 * @param {string} prompt - The user prompt
 * @param {string} cachedSystemPrompt - System prompt to cache (brand voice)
 * @param {object} options - Generation options
 * @returns {Promise<string>} - Generated text
 */
export async function generateWithCache(prompt, cachedSystemPrompt, options = {}) {
  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 2000,
    temperature = 1,
  } = options

  const body = {
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: cachedSystemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      { role: 'user', content: prompt }
    ],
  }

  if (temperature !== 1) {
    body.temperature = temperature
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to generate content')
  }

  const data = await response.json()
  return data.content[0].text
}

/**
 * Analyze brand voice from examples
 * @param {string[]} examples - Content examples
 * @param {string} targetAudience - Who they're writing for
 * @param {string} wordsToAvoid - Words/phrases to avoid
 * @returns {Promise<string>} - Brand voice profile
 */
export async function analyzeBrandVoice(examples, targetAudience = '', wordsToAvoid = '') {
  const examplesText = examples.map((ex, i) => `Example ${i + 1}:\n${ex}`).join('\n\n---\n\n')

  const prompt = `Analyze the following content examples and create a detailed brand voice profile. This profile will be used to generate content that matches this writing style.

${examplesText}

${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Words/Phrases to Avoid: ${wordsToAvoid}` : ''}

Create a brand voice profile that includes:
1. **Tone & Personality**: Describe the overall tone (professional, casual, authoritative, friendly, etc.) and personality traits that come through in the writing.

2. **Writing Style**: Note specific patterns like sentence length, paragraph structure, use of questions, storytelling elements, data/statistics usage, etc.

3. **Vocabulary & Language**: Common phrases, industry terminology, level of formality, use of jargon, and any distinctive word choices.

4. **Content Structure**: How ideas are typically organized, use of headers, bullet points, calls-to-action, etc.

5. **Unique Characteristics**: Any standout elements that make this voice distinctive.

Write the profile in second person ("You write in a...") so it can be used as instructions for generating future content. Keep it concise but comprehensive (2-3 paragraphs).`

  const systemPrompt = 'You are an expert content strategist and brand voice analyst. Your job is to analyze writing samples and create clear, actionable brand voice profiles that can be used to generate consistent content.'

  return generate(prompt, { systemPrompt, maxTokens: 1500 })
}

/**
 * Analyze a brand style guide to extract rules and guidelines
 * @param {string} styleGuideText - The style guide document text
 * @param {string} targetAudience - Who they're writing for
 * @param {string} wordsToAvoid - Words/phrases to avoid
 * @returns {Promise<string>} - Brand voice profile based on rules
 */
export async function analyzeStyleGuide(styleGuideText, targetAudience = '', wordsToAvoid = '') {
  const prompt = `Analyze the following brand style guide and extract the key rules and guidelines into a usable brand voice profile. This is a STYLE GUIDE containing RULES about how to write, not examples of actual writing.

STYLE GUIDE:
${styleGuideText}

${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Additional Words/Phrases to Avoid: ${wordsToAvoid}` : ''}

Extract and organize the guidelines into a brand voice profile that includes:

1. **Tone & Voice Rules**: What tone should be used? What personality should come through? What emotions should the writing evoke?

2. **Do's and Don'ts**: Specific rules about what TO do and what NOT to do when writing.

3. **Language Guidelines**: Required terminology, forbidden words/phrases, level of formality, use of contractions, active vs passive voice, etc.

4. **Formatting Rules**: Requirements for sentence length, paragraph structure, use of headers, bullet points, etc.

5. **Brand-Specific Requirements**: Any unique brand requirements, taglines to include, phrases to use, etc.

Write the profile in second person ("You should...", "Always...", "Never...") so it can be used as instructions for generating future content. Be specific and actionable. Include all rules from the style guide - don't summarize or generalize them away.`

  const systemPrompt = 'You are an expert at analyzing brand style guides and extracting clear, actionable writing rules. Your job is to transform style guide documents into practical instructions that can be followed when creating content.'

  return generate(prompt, { systemPrompt, maxTokens: 2000 })
}

/**
 * Analyze brand voice by combining style guide rules with writing examples
 * @param {string} styleGuideText - The style guide document text
 * @param {string[]} examples - Content examples
 * @param {string} targetAudience - Who they're writing for
 * @param {string} wordsToAvoid - Words/phrases to avoid
 * @returns {Promise<string>} - Comprehensive brand voice profile
 */
export async function analyzeBrandVoiceWithGuide(styleGuideText, examples, targetAudience = '', wordsToAvoid = '') {
  const examplesText = examples.map((ex, i) => `Example ${i + 1}:\n${ex}`).join('\n\n---\n\n')

  const prompt = `Create a comprehensive brand voice profile by combining the RULES from the style guide with observations from the WRITING EXAMPLES.

BRAND STYLE GUIDE (contains rules and guidelines):
${styleGuideText}

---

WRITING EXAMPLES (actual content to analyze):
${examplesText}

${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${wordsToAvoid ? `Words/Phrases to Avoid: ${wordsToAvoid}` : ''}

Create a unified brand voice profile that:

1. **Incorporates All Style Guide Rules**: Include every do, don't, and requirement from the style guide.

2. **Adds Observed Patterns**: Note additional patterns from the writing examples that aren't explicitly stated in the style guide (sentence structures, storytelling techniques, hook styles, etc.).

3. **Resolves Any Conflicts**: If the examples differ from the style guide, note this and prioritize the style guide rules.

4. **Tone & Personality**: Combine stated tone guidelines with observed personality traits.

5. **Practical Writing Instructions**: Make everything actionable and specific.

Write the profile in second person as instructions for generating future content. Be comprehensive - include both the explicit rules AND the implicit patterns observed in the examples. This profile will be the primary guide for all future content generation.`

  const systemPrompt = 'You are an expert content strategist who specializes in creating comprehensive brand voice profiles. Your job is to combine explicit style guide rules with implicit patterns from writing examples to create detailed, actionable brand voice instructions.'

  return generate(prompt, { systemPrompt, maxTokens: 2500 })
}
