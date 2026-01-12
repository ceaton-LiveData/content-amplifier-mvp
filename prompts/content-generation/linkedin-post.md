# LinkedIn Post Generation Prompt

**Purpose:** Generate engaging LinkedIn posts from transcript content

**Output:** 5 different LinkedIn posts (different angles/hooks from same content)

---

## Exact Prompt to Use
```
Generate a LinkedIn post from the following content.

BRAND VOICE PROFILE:
{brand_voice_profile}

TARGET AUDIENCE:
{target_audience}

TONE ADJUSTMENT:
{tone_override_instruction}

POST REQUIREMENTS:
- Length: 150-200 words
- Structure: Hook (1-2 sentences) → Insight/Story (3-4 sentences) → Call-to-action or question
- Start with an attention-grabbing hook that makes people want to read more
- Include at least one specific data point, statistic, or concrete example
- End with a question or call-to-action to drive engagement
- Use short paragraphs (1-3 sentences each) for readability
- Write in a way that encourages comments and discussion
- DO NOT use hashtags (user can add them later)
- Match the brand voice profile exactly

WORDS TO AVOID:
{words_to_avoid}

SOURCE CONTENT (excerpt from transcript):
---
{transcript_excerpt}
---

Generate ONE LinkedIn post following these requirements. The post should feel natural and conversational while maintaining professionalism appropriate for LinkedIn.

LinkedIn Post:
```

---

## Generating 5 Variations

**Approach:** Call this prompt 5 times with different excerpts or angles

**Strategy for variations:**

1. **Post 1:** Lead with surprising data/insight
2. **Post 2:** Lead with story/example
3. **Post 3:** Lead with question to audience
4. **Post 4:** Lead with contrarian view (if applicable)
5. **Post 5:** Lead with practical takeaway

**In code:**
```javascript
async function generateLinkedInPosts(transcript, brandVoice, options) {
  const posts = [];
  
  // Extract 5 different excerpts or angles from transcript
  const excerpts = extractKeyExcerpts(transcript, count: 5);
  
  for (let i = 0; i < 5; i++) {
    const post = await generateLinkedInPost({
      excerpt: excerpts[i],
      brandVoice,
      angle: ['data', 'story', 'question', 'contrarian', 'takeaway'][i],
      ...options
    });
    
    posts.push(post);
  }
  
  return posts;
}
```

---

## Tone Override Instructions

**If `toneOverride === 'formal'`:**
```
Write in a more formal, executive-level tone than the brand voice profile. Use business terminology, structured language, and a serious professional demeanor. Avoid contractions and casual phrases.
```

**If `toneOverride === 'casual'`:**
```
Write in a more conversational, approachable tone than the brand voice profile. Use contractions, friendly language, and a warm personal style. Sound like you're talking to a colleague over coffee.
```

**If `toneOverride === 'technical'`:**
```
Write with more technical depth and data focus than the brand voice profile. Include specific metrics, technical details, and industry terminology. Assume the reader has domain expertise.
```

**If `toneOverride === null` (default):**
```
Match the tone in the brand voice profile exactly. Don't adjust formality up or down.
```

---

## Expected Output Format
```
[Hook paragraph]

[Insight/story paragraph with data point]

[Additional context paragraph]

[Question or call-to-action to drive engagement]
```

**Example output:**
```
73% of OR capacity goes unused due to poor block scheduling. That's not a staffing problem—it's a data problem.

In our recent analysis of 50+ hospital systems, we found that most surgical departments are flying blind when it comes to block utilization. They're making scheduling decisions based on gut feel and historical patterns that no longer reflect reality.

The hospitals seeing the biggest improvements? They're the ones tracking utilization in real-time and automatically releasing unused blocks before it's too late to fill them. It's not rocket science, but it requires systems that most hospitals don't have yet.

For surgical services leaders: What's your biggest challenge in optimizing OR capacity?
```

---

## Usage in Code
```javascript
// /src/core/content-generation/generators/linkedin.js

import { loadPrompt } from '@/prompts/loader';
import { claudeAPI } from '@/infrastructure/ai/claude';

async function generateLinkedInPost({
  transcriptExcerpt,
  brandVoice,
  targetAudience,
  wordsToAvoid,
  toneOverride
}) {
  // Load prompt template
  const template = await loadPrompt('linkedin-post');
  
  // Build tone instruction
  const toneInstruction = getToneInstruction(toneOverride);
  
  // Fill in variables
  const prompt = template
    .replace('{brand_voice_profile}', brandVoice)
    .replace('{target_audience}', targetAudience)
    .replace('{tone_override_instruction}', toneInstruction)
    .replace('{words_to_avoid}', wordsToAvoid)
    .replace('{transcript_excerpt}', transcriptExcerpt);
  
  // Call Claude with cached brand voice
  const post = await claudeAPI.generateWithCache(
    prompt,
    `Brand voice:\n${brandVoice}` // Cached system prompt
  );
  
  return post.trim();
}
```

---

## Quality Checks

After generation, validate:

- [ ] Length: 150-200 words (±20 words acceptable)
- [ ] Has clear hook in first 1-2 sentences
- [ ] Includes at least one specific data point or example
- [ ] Ends with question or call-to-action
- [ ] No hashtags included
- [ ] Matches brand voice (manual check)
- [ ] No forbidden words used

---

## Cost Estimate

Per post:
- Input tokens: ~1,000 (brand voice + excerpt)
- Output tokens: ~250
- **Cost: ~$0.08 per post**
- **5 posts: ~$0.40 total**

With prompt caching (brand voice cached):
- **Cost: ~$0.05 per post after first**
- **5 posts: ~$0.25 total**

---

**Prompt Status:** Tested  
**Last Updated:** 2025-01-11  
**Cost per use:** ~$0.05-0.08