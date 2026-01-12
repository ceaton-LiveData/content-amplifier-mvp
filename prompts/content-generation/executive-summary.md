# Executive Summary Generation Prompt

**Purpose:** Generate executive summary from transcript content

**Output:** 250-400 word executive summary

---

## Exact Prompt to Use
```
Generate an executive summary from the following content.

BRAND VOICE PROFILE:
{brand_voice_profile}

TARGET AUDIENCE:
{target_audience}

TONE ADJUSTMENT:
{tone_override_instruction}

EXECUTIVE SUMMARY REQUIREMENTS:
- Length: 250-400 words
- Structure: Overview → Key insights (3-5 bullets) → Recommendations
- Suitable for forwarding to executives
- Lead with the most important insight
- Quantify where possible (numbers, stats, percentages)
- 3-5 key takeaways in bullet points
- Clear next steps or recommendations
- Business-focused, executive-level tone

WORDS TO AVOID:
{words_to_avoid}

SOURCE CONTENT:
---
{transcript_content}
---

Generate the executive summary following this structure:

## Executive Summary

[Overview paragraph - most important insight first]

**Key Findings:**
- [Finding 1 with data]
- [Finding 2 with data]
- [Finding 3 with data]
- [Finding 4 - if applicable]
- [Finding 5 - if applicable]

**Recommendations:**
[1-2 paragraphs with clear next steps]

Match the brand voice. Focus on what matters to executives: impact, ROI, strategic implications.

Executive Summary:
```

---

## Expected Output Format
```markdown
## Executive Summary

Analysis of 50+ hospital surgical departments reveals that 73% of OR capacity inefficiency stems from block scheduling misalignment, not staffing or equipment constraints. This represents a $2-3M annual revenue opportunity for a typical 200-bed hospital.

**Key Findings:**
- Real-time utilization tracking reduces unused capacity by 15-20% within 90 days
- Automated block release protocols recover average of 8-12 OR hours per week
- Data-driven scheduling decisions outperform historical patterns by 30%
- Integration with existing EHR systems requires minimal IT resources (4-6 weeks)
- ROI typically achieved within 6 months based on increased case volume

**Recommendations:**

Prioritize implementing real-time visibility into OR block utilization as the foundation. This enables surgical services leadership to make proactive capacity decisions rather than reactive adjustments. Begin with a pilot in one department to demonstrate ROI before full deployment.

Next steps: 1) Assess current utilization tracking capabilities, 2) Identify quick-win opportunities for block release automation, 3) Establish baseline metrics for measuring improvement.
```

---

## Cost Estimate

- Input tokens: ~1,500
- Output tokens: ~350
- **Cost: ~$0.08 per summary**

---

**Prompt Status:** Tested  
**Last Updated:** 2025-01-11
```

---

**That's everything you need!** 

Here's what you now have:

**Documentation:**
- ✅ README.md
- ✅ PRD.md
- ✅ TECHNICAL_SPEC.md
- ✅ IMPLEMENTATION_GUIDE.md

**Configuration:**
- ✅ .gitignore
- ✅ .env.example
- ✅ package.json
- ✅ tailwind.config.js
- ✅ postcss.config.js
- ✅ vite.config.js
- ✅ vercel.json

**Database:**
- ✅ schema.sql
- ✅ seed-data.sql

**Prompts (all 5 content types):**
- ✅ brand-voice-analysis.md
- ✅ linkedin-post.md
- ✅ blog-post.md
- ✅ email-sequence.md
- ✅ twitter-thread.md
- ✅ executive-summary.md

**Testing:**
- ✅ test-scenarios.md

**Starter code:**
- ✅ index.html
- ✅ /src/main.jsx
- ✅ /src/index.css
- ✅ /src/App.jsx

---

**Now you're ready to start building!** 

Open a new chat with Claude Code and paste:
```
I'm building Content Amplifier - an AI tool that transforms transcripts into multiple content pieces.

Please read these files to understand the project:
1. /docs/IMPLEMENTATION_GUIDE.md - Your step-by-step build instructions
2. /docs/TECHNICAL_SPEC.md - Architecture and tech decisions
3. /docs/PRD.md - Product requirements

Start with Phase 1: Foundation
- Initialize the project using the package.json
- I'll provide Supabase and Anthropic API keys when you need them
- Follow the implementation guide autonomously

Begin now.