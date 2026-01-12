# Product Requirements Document: AI Content Repurposing Engine

**Version:** 1.0 MVP  
**Target Launch:** 4 weeks from start  
**Primary Use Case:** B2B marketing teams (starting with LiveData)

---

## Executive Summary

**What we're building:**  
A web application that transforms long-form content transcripts into multiple derivative content pieces (LinkedIn posts, blog posts, email sequences, etc.) while maintaining the customer's brand voice and style.

**The problem:**  
Marketing teams (especially solo marketers) create webinars, podcasts, and video content but struggle to repurpose it across channels. Manual repurposing is time-consuming and inconsistent.

**The solution:**  
Upload a transcript → AI generates 10+ content pieces in your brand voice → Copy/download/use immediately.

**Why now:**  
- AI quality is finally good enough (Claude 3.5 Sonnet)
- Most platforms auto-generate transcripts
- Marketing teams are understaffed and overstretched
- LiveData spends significant budget on content creation

**Success criteria (MVP):**
- LiveData marketing uses it weekly for 4+ consecutive weeks
- Generated content requires only minor edits (not rewrites)
- Processing completes in under 5 minutes
- User would pay $300/month for this capability

---

## Product Vision & Scope

### In Scope (MVP)

**Core Features:**
- ✅ Upload transcript files (.txt, .docx, .vtt, .srt, .pdf)
- ✅ Brand voice configuration (upload brand guide OR paste examples)
- ✅ Select which content types to generate (checkboxes)
- ✅ Tone adjustment per generation (formal, casual, technical)
- ✅ Generate content: LinkedIn posts (5), blog post (1), email sequence (5), Twitter thread (1), executive summary (1)
- ✅ View/copy/download generated content
- ✅ User authentication (email/password)
- ✅ Usage limits (prevent abuse)

### Out of Scope (Post-MVP)

**Features to add later:**
- ❌ Video/audio upload with transcription (users provide transcripts)
- ❌ Direct publishing to social platforms
- ❌ Team collaboration features
- ❌ Custom template editor UI
- ❌ Advanced analytics/reporting
- ❌ API access
- ❌ Multi-language support
- ❌ Payment integration (Stripe)

### Design Principles

1. **Simplicity over features** - Do one thing exceptionally well
2. **Speed over perfection** - 80% quality in 5 minutes beats 100% in 2 hours
3. **Flexibility with defaults** - Smart defaults, but users can adjust
4. **Trust through transparency** - Show what the AI is doing, let users refine

---

## User Personas

### Primary: Sarah (Solo Marketing Manager at B2B SaaS)

**Background:**
- Runs marketing solo or with 1-2 people
- Creates 2-4 webinars/month, occasional podcasts
- Budget: $5K-15K/month for content/tools
- Reports to CEO or VP Sales

**Pain Points:**
- "I spend 3-4 hours manually creating LinkedIn posts from each webinar"
- "I know I should be doing more content marketing but don't have time"
- "Our content feels inconsistent across channels"
- "I pay agencies $2K/month for content I could do myself if I had time"

**Goals:**
- 10x content output without 10x budget
- Maintain consistent brand voice
- Spend time on strategy, not execution
- Prove marketing ROI with more touchpoints

**How she'll use this:**
- Upload transcript from weekly webinar
- Select LinkedIn + Blog + Email
- Review/tweak generated content (15 min)
- Publish across channels
- Repeat weekly

---

### Secondary: Chris (Product Manager at LiveData)

**Background:**
- Senior PM at healthcare tech company
- Needs thought leadership content for LinkedIn
- Has demos, strategy calls, product discussions on video
- No formal marketing support

**Pain Points:**
- "I have great content in my head but no time to write it"
- "I record strategy sessions but they just sit there"
- "I need to build my personal brand but writing is slow"

**Goals:**
- Convert existing recorded content into posts
- Build thought leadership presence
- Share insights without hours of writing
- Engage with healthcare tech community

**How he'll use this:**
- Upload transcript from recorded strategy call
- Generate LinkedIn posts focused on healthcare tech insights
- Review, add personal touches
- Post 2-3x per week

---

## User Flows

### Flow 1: First-Time Setup (5 minutes)
```
1. User lands on homepage
   → [Sign Up] button

2. Sign up form
   → Email, password, name
   → [Create Account]

3. Welcome screen: "Let's set up your brand voice"
   → Two options shown:
      A) Upload brand guide/style document (.pdf, .docx, .txt)
      B) Paste 2-3 examples of your content
   
4. User chooses Option A: Upload document
   → Drag/drop brand guide PDF
   → Upload progress bar
   → "Analyzing your brand voice..." (30 seconds)

5. Brand voice profile displayed
   → 2-3 paragraph summary of their style
   → "Does this capture your voice?"
   → [Looks Good] [Let Me Edit] buttons

6. User clicks [Looks Good]
   → Redirect to main dashboard
   → "Ready to create content! Upload your first transcript"
```

**Alternative: User chooses Option B (paste examples)**
```
4b. User pastes 3 content examples
    → Text areas for each example
    → "Who is your target audience?" field
    → "Any words/phrases to avoid?" field
    → [Analyze My Style] button

5b. Same brand voice profile display
6b. Same redirect to dashboard
```

---

### Flow 2: Generate Content (5-10 minutes)
```
1. Dashboard view
   → Usage: "2/10 transcripts used this month"
   → [Upload Transcript] button (primary CTA)
   → Recent content library below

2. User clicks [Upload Transcript]
   → File upload modal
   → Drag/drop or browse
   → Supported: .txt, .docx, .vtt, .srt, .pdf
   → Max size: 25MB shown

3. User drops transcript file
   → Upload progress bar
   → File processes (text extraction: 5-10 seconds)
   → Success: "Transcript ready!"

4. Content selection screen
   → "What would you like to generate?"
   → Checkboxes:
      ☑ LinkedIn Posts (5 variations)
      ☑ Blog Post (1)
      ☑ Email Sequence (5 emails)
      ☐ Twitter Thread (1)
      ☐ Executive Summary (1)
   
   → Tone selector:
      ○ More formal than usual
      ● Match my brand voice (default)
      ○ More casual than usual
      ○ Technical/Data-focused
   
   → [Generate Content] button

5. User clicks [Generate Content]
   → Processing screen with status:
      ✓ Analyzing transcript...
      ✓ Generating LinkedIn posts... (1/5)
      ⋯ Generating LinkedIn posts... (3/5)
      ⏳ Generating blog post...
   → Estimated time: "About 3 minutes remaining"

6. Processing completes
   → "✓ Content ready!"
   → Redirect to content library for this transcript
```

---

### Flow 3: Review & Use Content
```
1. Content library view (for one transcript)
   → Header: Transcript title, date processed
   → Organized by content type
   
2. LinkedIn Posts section
   → 5 cards showing post previews (first 100 chars)
   → Each card has [View Full] button

3. User clicks [View Full] on Post #1
   → Modal opens with full content
   → Formatted nicely (proper line breaks, etc.)
   → Action buttons:
      [📋 Copy to Clipboard]
      [↓ Download as .txt]
      [↓ Download as .md]
      [🔄 Regenerate This Post]

4. User clicks [Copy to Clipboard]
   → "✓ Copied!" confirmation
   → User pastes into LinkedIn composer
   → Makes minor edits
   → Posts

5. User closes modal
   → Returns to content library
   → Clicks on Blog Post card
   → Same view/copy/download options

6. User clicks [↓ Download as .md]
   → File downloads immediately
   → Opens in their text editor
   → User imports to their CMS
```

---

### Flow 4: Regenerate with Different Settings
```
1. User in content library
   → "Actually, these LinkedIn posts are too formal"

2. Scroll to top
   → [Regenerate All Content] button

3. Click [Regenerate All Content]
   → Content selection screen appears again
   → Previous selections pre-filled
   → Tone selector: change from "Match brand voice" to "More casual"
   
4. [Generate Content] again
   → Processing (faster this time - 2 minutes)
   → New content generated
   → Old content archived (still accessible)

5. View new casual-toned versions
   → Much better!
   → Copy and use
```

---

## Feature Specifications

### Feature 1: Brand Voice Configuration

**User Story:**  
As a marketer, I want the AI to capture my company's writing style so I don't have to heavily edit every piece of content.

**Acceptance Criteria:**
- [ ] User can upload brand document (.pdf, .docx, .txt) up to 10MB
- [ ] OR user can paste 2-5 text examples (LinkedIn posts, blog excerpts, etc.)
- [ ] System extracts text from uploaded documents
- [ ] Claude analyzes and generates brand voice profile (2-3 paragraphs)
- [ ] User can review and manually edit the profile if needed
- [ ] Profile is saved to account and used for all future generations
- [ ] User can update profile anytime from settings
- [ ] Analysis completes in <30 seconds

**UI Components:**
- File upload dropzone (drag/drop or click)
- Text areas for manual example input
- Loading state during analysis
- Display of generated brand voice profile
- Edit mode for profile (textarea)
- Save button

**Business Rules:**
- At least 1 example OR 1 document required
- Documents must contain readable text (not just images)
- If extraction fails, show clear error and fallback to manual paste
- Profile stored as plain text (not JSON)

---

### Feature 2: Transcript Upload & Processing

**User Story:**  
As a user, I want to upload a transcript file and have it processed quickly so I can get content fast.

**Acceptance Criteria:**
- [ ] Supports file types: .txt, .docx, .vtt, .srt, .pdf
- [ ] Max file size: 25MB (handles 3-4 hour transcripts)
- [ ] Shows upload progress bar
- [ ] Extracts text from all supported formats
- [ ] Processing completes in <30 seconds for typical transcript
- [ ] Handles errors gracefully (corrupted files, unsupported formats)
- [ ] User can optionally add title/notes to transcript
- [ ] Transcript stored in database (not original file, just text)

**UI Components:**
- File upload modal
- Progress indicator
- Error messages (specific, helpful)
- Optional metadata fields (title, notes)
- Success confirmation

**Technical Details:**
- Use libraries: mammoth (DOCX), pdf-parse (PDF), custom parser (VTT/SRT)
- Validate file type before upload
- Show file size and estimated processing time
- Delete uploaded file after text extraction (save space)

**Business Rules:**
- Free tier: 10 transcripts/month
- Rejects files >25MB
- Transcripts stored indefinitely (unless user deletes)
- One transcript = one processing job

---

### Feature 3: Content Type Selection

**User Story:**  
As a user, I want to choose which content types to generate so I only pay for what I need and processing is faster.

**Acceptance Criteria:**
- [ ] After uploading transcript, user sees content type checkboxes
- [ ] All types shown with counts: "LinkedIn Posts (5)", "Blog Post (1)", etc.
- [ ] At least 1 type must be selected (enforce validation)
- [ ] Default selections: LinkedIn, Blog, Email (most common)
- [ ] User can select/deselect any combination
- [ ] Shows estimated processing time based on selections
- [ ] Shows estimated cost (post-MVP when pricing added)

**Available Content Types:**
1. LinkedIn Posts (generates 5 variations)
2. Blog Post (1 long-form article)
3. Email Sequence (5 emails)
4. Twitter Thread (8-12 tweets)
5. Executive Summary (1 one-pager)

**UI Components:**
- Checkbox list with counts
- Visual hierarchy (most popular types first)
- Estimated time display
- [Generate] button (disabled if nothing selected)

**Business Rules:**
- Minimum 1 type selected
- Each type has defined output count (not configurable in MVP)
- Selections stored per generation (can regenerate with different types)

---

### Feature 4: Tone Adjustment

**User Story:**  
As a user, I want to adjust tone for specific content without changing my overall brand voice profile.

**Acceptance Criteria:**
- [ ] Tone selector shown before generation
- [ ] 4 options: More formal, Match brand voice (default), More casual, Technical/Data-focused
- [ ] Selection applies to all content in this generation
- [ ] User can regenerate with different tone
- [ ] Tone override stored with generated content
- [ ] Clear description of what each tone means

**UI Components:**
- Radio button selector
- Descriptive labels for each option
- Default pre-selected (Match brand voice)

**Tone Definitions:**
- **More formal:** Executive-level, business-oriented, structured
- **Match brand voice:** Exactly as brand voice profile describes
- **More casual:** Conversational, approachable, uses contractions
- **Technical/Data-focused:** More metrics, technical depth, specific examples

**Business Rules:**
- Tone only applies to current generation
- Doesn't modify saved brand voice profile
- Can be different for each transcript processed

---

### Feature 5: Content Generation Engine

**User Story:**  
As a user, I want AI to generate high-quality, on-brand content that requires minimal editing.

**Acceptance Criteria:**
- [ ] Generates all selected content types from transcript
- [ ] Each piece reflects brand voice profile accurately
- [ ] Applies tone adjustment if selected
- [ ] Uses templates defined in system
- [ ] Processing completes in 3-5 minutes for full set
- [ ] Shows real-time progress during generation
- [ ] Handles API failures gracefully (retry logic)
- [ ] All content stored in database

**Content Quality Standards:**
- LinkedIn posts: Engaging hooks, 150-200 words, include data/stats
- Blog posts: 800-1200 words, clear structure, SEO-friendly
- Email sequence: Progressive education, 100-150 words each
- Twitter threads: Punchy, 8-12 tweets, numbered
- Executive summary: Business-focused, 250-400 words

**Technical Details:**
- Use Claude 3.5 Sonnet for all generation
- Enable prompt caching (brand voice cached across calls)
- Generate sequentially to avoid rate limits
- Store cost per piece for tracking
- Retry failed generations up to 3 times

**Performance:**
- LinkedIn posts: ~30 seconds total (5 posts)
- Blog post: ~45 seconds
- Email sequence: ~30 seconds (5 emails)
- Twitter thread: ~15 seconds
- Executive summary: ~15 seconds
- **Total: ~2-3 minutes for everything**

---

### Feature 6: Content Library & Export

**User Story:**  
As a user, I want to easily view, copy, and download all my generated content.

**Acceptance Criteria:**
- [ ] Dashboard shows all processed transcripts
- [ ] Click transcript → see all generated content organized by type
- [ ] Each content piece shown as card with preview
- [ ] Click card → full-screen modal with complete content
- [ ] One-click copy to clipboard
- [ ] Download as .txt or .md
- [ ] Regenerate button creates new version
- [ ] Old versions archived (accessible via version history)

**UI Components:**
- Card grid layout for content pieces
- Preview text (first 100 characters)
- Color coding by content type
- Full-screen modal for reading
- Action buttons: Copy, Download (.txt), Download (.md), Regenerate
- Confirmation toasts ("Copied!", "Downloaded!")

**Content Display:**
- Proper formatting (line breaks preserved)
- Syntax highlighting for markdown
- Readable font and spacing
- Print-friendly view

**Business Rules:**
- Content never deleted (only archived when regenerated)
- Downloads are instant (client-side generation)
- Copy works across all browsers
- Version history shows last 3 versions per content piece

---

### Feature 7: Usage Limits & Tracking

**User Story:**  
As the product owner, I want to prevent abuse of the free tier while being fair to users.

**Acceptance Criteria:**
- [ ] Track transcripts processed per account per month
- [ ] Free tier: 10 transcripts/month (configurable)
- [ ] Display usage on dashboard: "3/10 transcripts this month"
- [ ] Progress bar shows usage visually
- [ ] Prevent upload if limit reached
- [ ] Clear error message when limit hit with upgrade CTA
- [ ] Counter resets on 1st of each month (UTC)
- [ ] Admin can manually adjust limits per account

**UI Components:**
- Usage widget on dashboard
- Progress bar (visual indicator)
- Limit reached modal
- Upgrade CTA (post-MVP: link to pricing)

**Business Rules:**
- Count increments when generation completes (not on upload)
- Failed generations don't count toward limit
- Regenerating same transcript doesn't count again
- Admins can grant extra credits manually

**Future Tiers (not built yet, but table supports):**
- Starter: 20 transcripts/month - $99/month
- Pro: 50 transcripts/month - $299/month
- Enterprise: Unlimited - Custom pricing

---

## Success Metrics (MVP)

### Technical Metrics
- [ ] Processing time: <5 min for full content set
- [ ] Uptime: 99%+ (Vercel/Supabase SLA)
- [ ] Error rate: <5% of processing jobs
- [ ] Cost per transcript: <$1.50

### Product Metrics
- [ ] LiveData marketing processes 4+ transcripts in first month
- [ ] User returns weekly for 4+ consecutive weeks
- [ ] Generated content used with <30% editing (measured via user survey)
- [ ] User would pay $300/month (validated through conversation)

### Quality Metrics
- [ ] Brand voice match: 4/5 rating from user
- [ ] Content usability: 3+ pieces used as-is per transcript
- [ ] Time savings: 80%+ vs manual repurposing (user reported)

---

## Out of Scope (Explicitly NOT Building)

To keep MVP focused, these features are intentionally excluded:

**Content Publishing:**
- Direct posting to LinkedIn, Twitter, etc.
- Social media calendar integration
- Scheduling/queuing posts

**Collaboration:**
- Team workspaces
- Commenting on content
- Approval workflows
- Shared brand voice profiles

**Advanced Customization:**
- Visual template editor
- Custom content types
- Drag-and-drop UI builder
- Conditional logic in templates

**Analytics:**
- Track which content performs best
- A/B testing variations
- Engagement metrics
- ROI reporting

**Enterprise Features:**
- SSO/SAML
- Multiple brand voices per account
- API access
- Webhook integrations
- White-labeling

**Why these are out of scope:**
We need to validate core value prop first: "Can we generate usable content from transcripts?" Everything else is optimization.

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AI output doesn't match brand voice well | High | Medium | Test extensively with LiveData content before launch; iterate on prompts; allow manual profile editing |
| Content quality inconsistent across types | Medium | Medium | Define clear quality standards; test each template; get user feedback early |
| Users hit rate limits frequently | Medium | Low | Set realistic free tier limit; track actual usage; add overage options |
| File upload fails for large transcripts | Medium | Low | Set 25MB limit; show clear error with workaround; add chunking if needed |
| Users abandon during onboarding | High | Medium | Make brand voice setup optional; provide "skip for now" option; use defaults |
| Claude API outages | Medium | Low | Implement retry logic; show clear status; queue for later if extended outage |
| Cost overruns from inefficient prompts | Medium | Medium | Use prompt caching; monitor costs daily; optimize prompts; set hard budget alerts |

---

## Open Questions

**To resolve before/during build:**

1. **Product naming:** What do we call this product?
   - Need a name for branding, domain, marketing

2. **Pricing (post-MVP):** What should tiers cost?
   - Free: 10 transcripts/month
   - Starter: $99 for 20 transcripts/month?
   - Pro: $299 for 50 transcripts/month?

3. **Content quality threshold:** How do we measure "good enough"?
   - User survey after each generation?
   - Track edit rate?
   - Qualitative feedback?

4. **LiveData-specific approach:** Generic product from day 1 or white-label for LiveData?
   - Affects branding, positioning, roadmap

5. **Template evolution:** How do we improve templates over time?
   - Collect user edits and learn from them?
   - Manual improvement based on feedback?
   - A/B test variations?

---

## Next Steps

1. **Review this PRD** - Get feedback, make adjustments
2. **Validate with LiveData marketing** - Confirm they'd use this, show mockups
3. **Create Supabase project** - Set up infrastructure
4. **Begin Phase 1 implementation** - Auth + database foundation
5. **Weekly check-ins** - Review progress, adjust scope

**Target Launch:** February 8, 2026 (4 weeks from 2025-01-11)

---

**Document Status:** Draft v1.0  
**Last Updated:** 2025-01-11  
**Owner:** Chris (Product)  
**Next Review:** After initial feedback