# Blog Post Generation Prompt

**Purpose:** Generate comprehensive blog post from transcript content

**Output:** 1 blog post (800-1200 words)

---

## Exact Prompt to Use
```
Generate a blog post from the following content.

BRAND VOICE PROFILE:
{brand_voice_profile}

TARGET AUDIENCE:
{target_audience}

TONE ADJUSTMENT:
{tone_override_instruction}

BLOG POST REQUIREMENTS:
- Length: 800-1200 words
- Structure: Introduction (problem/context) → Main sections (2-4 key points) → Practical takeaways → Conclusion
- SEO-friendly title (60 characters or less)
- Clear section headers (use ## for markdown formatting)
- Include 2-3 specific examples or case studies from the content
- Add a "Key Takeaways" section with 3-5 bullet points
- Conversational but professional tone
- Make it scannable with short paragraphs and headers

WORDS TO AVOID:
{words_to_avoid}

SOURCE CONTENT (full transcript or major excerpts):
---
{transcript_content}
---

Generate the complete blog post following this structure:

# [SEO-Friendly Title]

[Introduction: 2-3 paragraphs setting up the problem/context]

## [Section 1 Header]
[Content with examples]

## [Section 2 Header]
[Content with examples]

## [Section 3 Header - if needed]
[Content with examples]

## Key Takeaways
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]
- [Takeaway 4 - optional]
- [Takeaway 5 - optional]

## Conclusion
[Wrap-up paragraph with call-to-action]

Match the brand voice profile exactly. Make it valuable and actionable for the target audience.

Blog Post:
```

---

## Expected Output Format
```markdown
# How to Optimize OR Capacity: Lessons from 50+ Hospital Systems

Operating room utilization remains one of the most challenging aspects of surgical services management. Despite significant investments in technology and personnel, most hospitals struggle to optimize their OR capacity effectively. The result? Wasted resources, frustrated surgeons, and missed revenue opportunities.

After analyzing data from over 50 hospital systems, we've identified three critical factors that separate high-performing surgical departments from those constantly battling inefficiency. The good news: these aren't about buying expensive new equipment or hiring more staff. They're about smarter use of the resources you already have.

## Real-Time Visibility Makes All the Difference

The most successful hospitals we studied had one thing in common: they could see their OR utilization in real-time, not just in retrospective reports. When surgical services directors can monitor block usage throughout the day, they can make immediate adjustments instead of discovering problems after the fact.

[Continue with more specific examples and data...]

## Key Takeaways

- Real-time visibility into OR utilization enables proactive capacity management
- Automated block release protocols can recover 15-20% of unused capacity
- Data-driven scheduling decisions outperform historical patterns by 30%
- Integration with EHR systems reduces administrative burden while improving accuracy

## Conclusion

Optimizing OR capacity doesn't require a complete overhaul of your systems. Start with visibility, add automation where it makes sense, and let data guide your scheduling decisions. The hospitals seeing the biggest improvements made these changes incrementally, proving that you can achieve significant results without disrupting current operations.
```

---

## Usage Notes

**For longer transcripts (60+ minutes):**
- Extract key themes and examples
- Don't try to include everything
- Focus on 2-4 main points

**For shorter transcripts (15-30 minutes):**
- May need to expand on concepts
- Add relevant context beyond transcript
- Still aim for 800+ words

---

## Cost Estimate

- Input tokens: ~2,500-4,000 (full transcript + brand voice)
- Output tokens: ~1,200-1,500
- **Cost: ~$0.15-0.20 per blog post**

With caching:
- **Cost: ~$0.10-0.15 per blog post**

---

**Prompt Status:** Tested  
**Last Updated:** 2025-01-11