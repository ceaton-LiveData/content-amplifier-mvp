# Email Sequence Generation Prompt

**Purpose:** Generate nurture email sequence from transcript content

**Output:** 5 emails with progressive education

---

## Exact Prompt to Use
```
Generate a 5-email nurture sequence from the following content.

BRAND VOICE PROFILE:
{brand_voice_profile}

TARGET AUDIENCE:
{target_audience}

TONE ADJUSTMENT:
{tone_override_instruction}

EMAIL SEQUENCE REQUIREMENTS:
- 5 emails total
- Each email: 100-150 words (body text)
- Structure: 
  Email 1: Problem introduction
  Email 2-4: Educational value (different aspects)
  Email 5: Soft call-to-action
- Each email must have a compelling subject line
- Start each with a personalized greeting hook
- Build on previous email but each should stand alone
- Helpful, not salesy tone
- Email 5 includes soft CTA (e.g., "Want to learn more?")

WORDS TO AVOID:
{words_to_avoid}

SOURCE CONTENT:
---
{transcript_content}
---

Generate all 5 emails following this format:

---
EMAIL 1
Subject: [Compelling subject line]

Hi [FirstName],

[Email body - introduce the problem/topic]

[Signature]

---
EMAIL 2
Subject: [Subject line]

Hi [FirstName],

[Email body - educational content, first aspect]

[Signature]

---
[Continue for all 5 emails]

Each email should feel natural, helpful, and conversational. Match the brand voice exactly.

Email Sequence:
```

---

## Expected Output Format
```
---
EMAIL 1
Subject: Are you losing 30% of your OR capacity?

Hi [FirstName],

I wanted to share something surprising we discovered while analyzing surgical scheduling across 50+ hospital systems.

Most OR departments are losing about 30% of their available capacity—not due to staffing shortages or equipment issues, but simply because of inefficient block scheduling.

The hospitals that have solved this problem all made one fundamental change. I'll share what that is in my next email.

Best,
[Name]

---
EMAIL 2
Subject: The one thing high-performing OR departments do differently

Hi [FirstName],

Yesterday I mentioned that top-performing surgical departments have one thing in common. Here it is: real-time visibility into block utilization.

Instead of reviewing utilization reports after the fact, they monitor OR usage throughout the day. This allows them to release unused blocks early enough for other surgeons to claim them.

It sounds simple, but most hospitals still rely on weekly or monthly reports. By then, the opportunity is long gone.

Tomorrow I'll show you exactly how they make this work.

Best,
[Name]

---
[Continue pattern for emails 3-5]
```

---

## Email Sequence Strategy

**Email 1:** Hook with surprising data or problem
**Email 2:** Introduce first key concept/solution aspect
**Email 3:** Dive deeper into implementation or example
**Email 4:** Address common objections or challenges
**Email 5:** Soft CTA (offer resource, demo, conversation)

---

## Metadata to Include

For each email, also return:
```json
{
  "email_number": 1,
  "subject": "Are you losing 30% of your OR capacity?",
  "preview_text": "First 50 characters for preview pane",
  "recommended_delay_days": 2
}
```

---

## Cost Estimate

- Input tokens: ~2,000
- Output tokens: ~800 (all 5 emails)
- **Cost: ~$0.10 per sequence**

---

**Prompt Status:** Tested  
**Last Updated:** 2025-01-11