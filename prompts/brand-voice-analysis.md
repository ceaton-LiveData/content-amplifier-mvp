# Brand Voice Analysis Prompt

**Purpose:** Analyze example content or brand documents to generate a brand voice profile

**When to use:** During onboarding when user uploads brand guide or pastes examples

---

## Exact Prompt to Use
```
You are analyzing content to create a brand voice profile that will guide future AI-generated content.

I will provide either:
1. A brand guide/style document, OR
2. 2-5 example pieces of content from the same author/company

Your task: Identify concrete, replicable patterns in writing style.

{IF_DOCUMENT}
BRAND DOCUMENT:
---
{document_text}
---
{/IF_DOCUMENT}

{IF_EXAMPLES}
CONTENT EXAMPLES:
---
Example 1:
{example_1}

Example 2:
{example_2}

{if_example_3_exists}
Example 3:
{example_3}
{/if_example_3_exists}
---
{/IF_EXAMPLES}

TARGET AUDIENCE: {target_audience}

WORDS/PHRASES TO AVOID: {words_to_avoid}

---

Create a brand voice profile (2-3 paragraphs) that describes:

1. **Tone and formality level**
   - Where on the spectrum: very formal → conversational → casual?
   - Business-oriented or approachable?
   - Authoritative or collaborative?

2. **Sentence structure and length**
   - Average sentence length (short, medium, long)?
   - Simple or complex sentences?
   - Active or passive voice preference?

3. **Vocabulary and technical depth**
   - Industry jargon usage (heavy, moderate, minimal)?
   - Technical terms explained or assumed knowledge?
   - Specific terminology they use frequently?

4. **Audience engagement style**
   - First person (I/we), second person (you), or third person?
   - How do they connect with readers?
   - Questions, statements, or calls-to-action?

5. **Content patterns and structure**
   - Use of data/statistics?
   - Storytelling or direct facts?
   - Lists, bullets, or flowing prose?
   - Examples and analogies?

6. **Distinctive characteristics**
   - Signature phrases or expressions?
   - Unique stylistic choices?
   - What makes this voice recognizable?

**Important:**
- Focus on REPLICABLE patterns, not one-off choices
- Be specific (not "professional" but "professional yet approachable with occasional humor")
- Describe what TO DO, not just what to avoid
- Make it actionable for content generation

Generate the brand voice profile now (2-3 paragraphs):
```

---

## Expected Output Format

The AI should return 2-3 paragraphs of plain text, like:
```
This brand communicates in a professional yet approachable tone, striking a balance between clinical expertise and accessibility. Sentences average 15-20 words and favor active voice constructions. The writing addresses readers directly using second person ("you"), creating an engaging, consultative feel rather than lecturing.

Technical healthcare terminology is used confidently when discussing surgical workflows and OR management, but complex concepts are explained with concrete examples from hospital operations. Common phrases include "data-driven decisions," "optimize utilization," and "surgical block management." Statistics and specific metrics frequently support key points, lending credibility to recommendations.

The voice is educational without being condescending. Content typically follows a problem-insight-solution structure, using brief paragraphs (2-3 sentences) for readability. While maintaining professionalism, the writing occasionally incorporates light analogies to make technical concepts relatable. Questions are used strategically to engage readers and prompt reflection on their own practices.
```

---

## Usage in Code
```javascript
// /src/core/brand-voice/analyzer.js

import { buildPrompt } from './prompt-builder';
import { claudeAPI } from '@/infrastructure/ai/claude';

async function analyzeBrandVoice({
  documentText = null,
  examples = [],
  targetAudience,
  wordsToAvoid
}) {
  // Load prompt template
  const promptTemplate = await loadPrompt('brand-voice-analysis');
  
  // Fill in variables
  const prompt = promptTemplate
    .replace('{document_text}', documentText || '')
    .replace('{example_1}', examples[0] || '')
    .replace('{example_2}', examples[1] || '')
    .replace('{example_3}', examples[2] || '')
    .replace('{target_audience}', targetAudience)
    .replace('{words_to_avoid}', wordsToAvoid);
  
  // Call Claude
  const brandVoiceProfile = await claudeAPI.generate(prompt, {
    maxTokens: 1000,
    temperature: 0.7
  });
  
  return brandVoiceProfile;
}
```

---

## Testing This Prompt

**Test with real LiveData content:**

1. Get 2-3 LinkedIn posts or blog excerpts from LiveData
2. Run through this prompt
3. Check output for:
   - Is it specific enough?
   - Does it capture actual patterns?
   - Could someone replicate this voice from the description?

**Quality criteria:**
- ✅ Specific (not generic "professional and engaging")
- ✅ Actionable (can guide content generation)
- ✅ Accurate (reflects actual examples)
- ✅ 2-3 paragraphs (not too long)

---

## Cost Estimate

- Input tokens: ~1,500-3,000 (depending on document/examples length)
- Output tokens: ~500-700
- **Cost per analysis: ~$0.10-0.15**

This is a one-time cost per account, so acceptable.

---

## Variations

**If analysis seems too generic:**

Add this to the prompt:
```
Be VERY specific. Instead of "professional," say "professional with occasional industry humor." Instead of "uses data," say "includes 2-3 specific metrics per article, often OR utilization percentages or time savings."
```

**If it's not capturing the voice well:**

Ask for revisions:
```
The profile you generated is too generic. Revise it to be more specific about:
- Exact sentence length patterns
- Specific phrases this brand uses
- Concrete examples of their style
```

---

**Prompt Status:** Tested and validated  
**Last Updated:** 2025-01-11  
**Cost per use:** ~$0.15