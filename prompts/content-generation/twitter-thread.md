# Twitter Thread Generation Prompt

**Purpose:** Generate Twitter/X thread from transcript content

**Output:** 8-12 tweets formatted as thread

---

## Exact Prompt to Use
```
Generate a Twitter/X thread from the following content.

BRAND VOICE PROFILE:
{brand_voice_profile}

TARGET AUDIENCE:
{target_audience}

TONE ADJUSTMENT:
{tone_override_instruction}

TWITTER THREAD REQUIREMENTS:
- Length: 8-12 tweets total
- Each tweet: 200-280 characters
- Structure: Hook tweet → Key points (1 per tweet) → Conclusion/CTA
- First tweet must be a scroll-stopping hook
- One key idea per tweet
- Use line breaks within tweets for readability
- Last tweet: Summary + question or CTA
- Number tweets (1/12, 2/12, etc.)
- Punchy and concise, Twitter-appropriate tone

WORDS TO AVOID:
{words_to_avoid}

SOURCE CONTENT:
---
{transcript_content}
---

Generate the complete thread. Format each tweet clearly with its number.

Twitter Thread:
```

---

## Expected Output Format
```
1/10

73% of OR capacity goes unused.

Not because of staffing.
Not because of equipment.

Because of one fixable problem ↓

---
2/10

The problem: Block scheduling based on gut feel instead of data.

Most surgical departments make scheduling decisions using historical patterns that no longer reflect reality.

---
3/10

We analyzed 50+ hospital systems to find what works.

The top performers had one thing in common:

Real-time visibility into block utilization.

---
[Continue for 8-12 tweets total]

---
10/10

The hospitals seeing biggest improvements:
- Track utilization in real-time
- Auto-release unused blocks
- Let data guide decisions

What's your biggest challenge in optimizing OR capacity?
```

---

## Cost Estimate

- Input tokens: ~1,500
- Output tokens: ~400
- **Cost: ~$0.08 per thread**

---

**Prompt Status:** Tested  
**Last Updated:** 2025-01-11