# Implementation Guide for Claude Code

**Project:** Content Amplifier MVP  
**Target:** 1 week to working product  
**Approach:** Autonomous implementation with human validation at phase boundaries

---

## Instructions for AI (Claude Code)

You are building this project with minimal human intervention. The human will:
- Provide Supabase/Anthropic API keys when you need them
- Test features at end of each phase
- Give product feedback (not technical direction)

You should:
- Write all code autonomously
- Make technical decisions based on TECHNICAL_SPEC.md
- Set up infrastructure
- Deploy automatically
- Ask human only for: API keys, product feedback, ambiguous requirements

---

## Project Setup (Do This First)

### 1. Initialize Project
```bash
# You should run these commands
npm create vite@latest . -- --template react
npm install

# Install core dependencies
npm install @supabase/supabase-js
npm install @anthropic-ai/sdk
npm install react-router-dom
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install dev dependencies
npm install -D @types/node
```

### 2. Project Structure

Create this folder structure:
```
/content-amplifier-mvp/
├── /docs/                    (already exists)
├── /prompts/                 (you'll create)
├── /database/                (you'll create)
├── /src/
│   ├── /core/               (business logic)
│   ├── /infrastructure/     (external services)
│   ├── /api/                (endpoints)
│   ├── /ui/
│   │   ├── /components/
│   │   ├── /pages/
│   │   └── /hooks/
│   └── /utils/
├── /public/
└── [config files]
```

### 3. Get API Keys from Human

Ask the human for:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

Create `.env` file (don't commit - it's in .gitignore):
```bash
# Ask human to provide these values
echo "VITE_SUPABASE_URL=<ask-human>" > .env
echo "VITE_SUPABASE_ANON_KEY=<ask-human>" >> .env
echo "ANTHROPIC_API_KEY=<ask-human>" >> .env
```

---

## Phase 1: Foundation (Days 1-3)

**Goal:** Authentication working, database set up, basic UI deployed

### Tasks You'll Complete Autonomously:

#### 1.1 Database Setup
```bash
# Connect to Supabase (human provides credentials)
# Run the schema from /database/schema.sql
```

**What to build:**
- Read `/database/schema.sql`
- Create all tables via Supabase dashboard or SQL editor
- Set up Row Level Security policies
- Seed default content templates

**Validation:**
- Tables exist in Supabase
- RLS policies active
- Default templates in `content_templates` table

#### 1.2 Authentication

**Build:**
- `/src/infrastructure/auth/supabase-auth.js` - Implements auth interface
- `/src/ui/pages/Login.jsx` - Login page
- `/src/ui/pages/Signup.jsx` - Signup page
- `/src/ui/components/AuthGuard.jsx` - Protects routes

**Features:**
- Email/password signup
- Email/password login
- Logout
- JWT token management
- Redirect to dashboard after login

**UI Requirements:**
- Clean, simple forms
- Error messages displayed clearly
- Loading states during auth
- Tailwind styling

**Validation checkpoint:**
→ Ask human to test: "Can you sign up, log in, and see empty dashboard?"

#### 1.3 Basic Dashboard UI

**Build:**
- `/src/ui/pages/Dashboard.jsx` - Main dashboard
- `/src/ui/components/Layout.jsx` - App layout with nav
- `/src/App.jsx` - Routing setup

**Features:**
- Header with logo, user menu, logout
- Empty state: "Upload your first transcript"
- Usage indicator: "0/10 transcripts this month"
- Placeholder for transcript list

**Validation checkpoint:**
→ Ask human: "Does the dashboard look clean and professional?"

#### 1.4 Deploy to Vercel

**Build:**
- `vercel.json` config
- Connect GitHub repo to Vercel
- Set environment variables in Vercel dashboard

**Steps:**
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Validation checkpoint:**
→ Share URL with human: "Can you access the deployed site and log in?"

---

## Phase 2: Brand Voice Setup (Days 4-6)

**Goal:** User can upload brand document or examples, system analyzes and stores brand voice

### Tasks You'll Complete Autonomously:

#### 2.1 File Upload Component

**Build:**
- `/src/ui/components/FileUpload.jsx` - Reusable file upload
- Drag-and-drop support
- File type validation
- Progress indicator

**Features:**
- Accept: .pdf, .docx, .txt
- Max size: 10MB
- Show file name and size
- Clear error messages

#### 2.2 Text Extraction

**Build:**
- `/src/core/processing/text-extractor.js`

**Install dependencies:**
```bash
npm install mammoth pdf-parse
```

**Implement:**
- Extract text from PDF (pdf-parse)
- Extract text from DOCX (mammoth)
- Handle .txt directly
- Error handling for corrupted files

#### 2.3 Brand Voice Analysis

**Build:**
- `/src/core/brand-voice/analyzer.js` - Core analysis logic
- `/src/infrastructure/ai/claude.js` - Claude API client
- `/src/ui/pages/Onboarding.jsx` - Onboarding flow

**Use prompt from:** `/prompts/brand-voice-analysis.md`

**Features:**
- Two options: Upload document OR paste examples
- "Target audience" text field
- "Words to avoid" text field
- Call Claude API to analyze
- Display generated brand voice profile
- Allow user to edit profile before saving
- Save to `accounts` table

**Validation checkpoint:**
→ Ask human to upload LiveData brand guide and verify: "Does this profile capture your brand voice accurately?"

#### 2.4 Brand Voice Storage & Retrieval

**Build:**
- `/src/infrastructure/database/supabase.js` - Database operations
- Implement interface methods:
  - `getAccount(userId)`
  - `updateAccount(userId, data)`

**Store:**
- `brand_voice_profile` (text)
- `brand_voice_source_type` (document/examples)
- `example_content` (JSONB if examples pasted)
- `target_audience`
- `words_to_avoid`

**Validation checkpoint:**
→ Verify data saved correctly in Supabase dashboard

---

## Phase 3: Transcript Upload (Days 7-9)

**Goal:** User can upload transcript, extract text, store it

### Tasks You'll Complete Autonomously:

#### 3.1 Transcript Upload UI

**Build:**
- `/src/ui/pages/UploadTranscript.jsx` - Upload page
- Modal or dedicated page (your choice based on UX)

**Features:**
- File upload (same component from Phase 2)
- Accept: .txt, .docx, .vtt, .srt, .pdf
- Max size: 25MB
- Optional fields: title, notes
- Upload to Supabase Storage temporarily
- Extract text
- Save to `content_sources` table
- Delete uploaded file (keep only text)

#### 3.2 Transcript Text Extraction

**Build:**
- `/src/core/processing/transcript-processor.js`

**Handle formats:**
- .txt - read directly
- .docx - use mammoth
- .pdf - use pdf-parse
- .vtt - custom parser (WebVTT subtitle format)
- .srt - custom parser (SubRip subtitle format)

**VTT/SRT parsing:**
```javascript
// Example VTT format:
// WEBVTT
//
// 00:00:00.000 --> 00:00:03.000
// First line of text
//
// 00:00:03.000 --> 00:00:06.000
// Second line of text

// Extract just the text, ignore timestamps
```

#### 3.3 Content Source Storage

**Implement database methods:**
- `createContentSource(accountId, data)`
- `getContentSource(id)`
- `listContentSources(accountId)`

**Store:**
- `transcript_text` (extracted text)
- `original_filename`
- `source_type` (transcript)
- `title` (user-provided or filename)
- `notes` (optional)

**Validation checkpoint:**
→ Ask human to upload a transcript and verify: "Can you see your transcript in the dashboard?"

---

## Phase 4: Content Type Selection (Days 10-11)

**Goal:** User selects which content types to generate and adjusts tone

### Tasks You'll Complete Autonomously:

#### 4.1 Content Type Selector Component

**Build:**
- `/src/ui/components/ContentTypeSelector.jsx`

**Features:**
- Checkboxes for each content type:
  - ☑ LinkedIn Posts (5)
  - ☑ Blog Post (1)
  - ☑ Email Sequence (5)
  - ☐ Twitter Thread (1)
  - ☐ Executive Summary (1)
- Default: LinkedIn, Blog, Email checked
- At least 1 must be selected (validation)
- Show estimated time based on selections

**UI/UX:**
- Grid layout (2 columns on desktop)
- Clear labels with counts
- Disabled state when processing

#### 4.2 Tone Selector Component

**Build:**
- `/src/ui/components/ToneSelector.jsx`

**Features:**
- Radio buttons:
  - ○ More formal than usual
  - ● Match my brand voice (default)
  - ○ More casual than usual
  - ○ Technical/Data-focused
- Helpful descriptions for each option

#### 4.3 Generation Configuration Screen

**Build:**
- `/src/ui/pages/GenerateContent.jsx`

**Flow:**
1. User clicks transcript from dashboard
2. See transcript preview (first 500 chars)
3. Content type selector
4. Tone selector
5. [Generate Content] button
6. Redirect to processing screen

**Validation checkpoint:**
→ Ask human: "Is the content selection UI clear and easy to use?"

---

## Phase 5: Content Generation (Days 12-16)

**Goal:** Generate actual content using Claude API

### Tasks You'll Complete Autonomously:

#### 5.1 Template System

**Build:**
- `/src/core/content-generation/template-engine.js`

**Seed default templates** (if not already done):
Run SQL to insert templates from `/database/seed-data.sql`

**Implement:**
- `getTemplate(templateName)` - Fetch from database
- `buildPrompt(template, context)` - Construct Claude prompt

**Templates to support:**
- linkedin_post
- blog_post  
- email_sequence
- twitter_thread
- executive_summary

#### 5.2 Prompt Builder

**Build:**
- `/src/core/content-generation/prompt-builder.js`

**Use prompts from:** `/prompts/content-generation/`

**Function:**
```javascript
function buildPrompt(contentType, {
  transcript,
  brandVoice,
  template,
  targetAudience,
  wordsToAvoid,
  toneOverride
}) {
  // Combine into full Claude prompt
  // Use prompt from /prompts/content-generation/{contentType}.md
  // Insert variables
  // Return complete prompt
}
```

#### 5.3 Claude API Integration

**Build:**
- `/src/infrastructure/ai/claude.js`

**Install:**
```bash
npm install @anthropic-ai/sdk
```

**Implement:**
```javascript
import Anthropic from '@anthropic-ai/sdk';

class ClaudeProvider {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt, options = {}) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 2000,
      system: options.systemPrompt || '',
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    return response.content[0].text;
  }
  
  // Enable prompt caching for brand voice
  async generateWithCache(prompt, systemPrompt) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    return response.content[0].text;
  }
}
```

#### 5.4 Content Generator

**Build:**
- `/src/core/content-generation/generator.js`

**Main function:**
```javascript
async function generateContent({
  transcript,
  brandVoice,
  contentTypes,
  toneOverride,
  targetAudience,
  wordsToAvoid
}) {
  const results = [];
  
  for (const type of contentTypes) {
    const template = await getTemplate(type);
    const prompt = buildPrompt(type, {
      transcript,
      brandVoice,
      template,
      targetAudience,
      wordsToAvoid,
      toneOverride
    });
    
    // Use brand voice as cached system prompt
    const content = await claudeAPI.generateWithCache(
      prompt,
      `Brand voice:\n${brandVoice}`
    );
    
    // Parse response based on content type
    const parsed = parseContent(type, content);
    
    results.push({
      contentType: type,
      content: parsed
    });
  }
  
  return results;
}
```

#### 5.5 Processing Job Management

**Build:**
- Supabase Edge Function or API endpoint: `/api/generate`

**Flow:**
1. Create `content_generations` record (status: pending)
2. For each selected content type:
   - Generate content
   - Save to `generated_content` table
   - Update progress
3. Update generation status: complete
4. Return generation ID

**Error handling:**
- Retry failed API calls (3 attempts)
- Save error message if all retries fail
- Don't fail entire job if one content type fails

#### 5.6 Processing UI

**Build:**
- `/src/ui/pages/Processing.jsx`

**Features:**
- Show progress for each content type
- Estimated time remaining
- Cancel button (nice to have)
- Auto-redirect when complete

**Display:**
```
Generating your content...

✓ LinkedIn Posts (5) - Complete
✓ Blog Post - Complete
⏳ Email Sequence - Generating (2/5)...
⏳ Twitter Thread - Waiting...

Estimated time: 2 minutes remaining
```

**Validation checkpoint:**
→ Ask human to process a real transcript: "Does the generated content match your expectations? Does it sound like your brand voice?"

---

## Phase 6: Content Library & Export (Days 17-20)

**Goal:** User can view, copy, download generated content

### Tasks You'll Complete Autonomously:

#### 6.1 Content Library Page

**Build:**
- `/src/ui/pages/ContentLibrary.jsx`

**Features:**
- Show all content for one transcript
- Organized by content type
- Card layout with preview (first 100 chars)
- Click card → open full view

**Layout:**
```
Transcript: "Q4 Strategy Call"
Processed: 2 hours ago

LinkedIn Posts (5)
[Card] [Card] [Card] [Card] [Card]

Blog Post (1)
[Card - larger]

Email Sequence (5)
[Card] [Card] [Card] [Card] [Card]

...
```

#### 6.2 Content Detail Modal

**Build:**
- `/src/ui/components/ContentDetailModal.jsx`

**Features:**
- Full-screen modal
- Display complete content with formatting
- Action buttons:
  - 📋 Copy to Clipboard
  - ↓ Download as .txt
  - ↓ Download as .md
  - 🔄 Regenerate This Piece
- Close button (X)

**Copy to Clipboard:**
```javascript
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  // Show "Copied!" toast
}
```

**Download:**
```javascript
function downloadAsText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

#### 6.3 Dashboard Content List

**Build:**
- Update `/src/ui/pages/Dashboard.jsx`

**Features:**
- List all processed transcripts
- Show: title, date, status
- Click → navigate to content library
- Upload button prominent

**Validation checkpoint:**
→ Ask human: "Can you easily find, view, copy, and download your generated content?"

---

## Phase 7: Usage Limits & Polish (Days 21-23)

**Goal:** Prevent abuse, polish UI, handle errors gracefully

### Tasks You'll Complete Autonomously:

#### 7.1 Usage Tracking

**Build:**
- `/src/infrastructure/database/supabase.js` - Add methods:
  - `getUsageThisMonth(accountId)`
  - `incrementUsage(accountId)`

**Implement:**
- Query `content_generations` for current month
- Count completed generations
- Check against `plan_tier` limits

**Limits:**
- Free tier: 10 transcripts/month

#### 7.2 Usage Display

**Build:**
- `/src/ui/components/UsageWidget.jsx`

**Display on dashboard:**
```
Transcripts used: 3/10 this month
[Progress bar: ████░░░░░░]
```

#### 7.3 Limit Enforcement

**Build:**
- Check usage before allowing upload
- Show error modal if limit reached
- Clear message: "You've used all 10 transcripts this month. Upgrade to continue or wait until [next month]."

#### 7.4 Error Handling

**Improve error UX across app:**
- Network errors: "Connection lost. Retrying..."
- API errors: Show specific message
- Validation errors: Highlight field
- 404s: Friendly "Not found" page
- 500s: "Something went wrong. We've been notified."

**Build:**
- `/src/ui/components/ErrorBoundary.jsx`
- `/src/utils/errors.js` - Error formatting

#### 7.5 Loading States

**Add throughout app:**
- Skeleton loaders for lists
- Spinners for processing
- Progress bars for uploads
- Disabled states for buttons during actions

#### 7.6 Final Polish

**UI improvements:**
- Consistent spacing/padding
- Responsive (mobile-friendly)
- Accessible (keyboard navigation, ARIA labels)
- Professional typography
- Smooth transitions/animations

**Validation checkpoint:**
→ Ask human to go through entire flow: "Does everything feel polished and professional?"

---

## Phase 8: Testing & Launch Prep (Days 24-28)

**Goal:** Bug-free, ready for LiveData marketing to use

### Tasks You'll Complete Autonomously:

#### 8.1 End-to-End Testing

**Test scenarios** (from `/testing/test-scenarios.md`):

1. New user signup → onboarding → process transcript → use content
2. Existing user login → upload new transcript → regenerate with different tone
3. Hit usage limit → see error → can't upload more
4. Upload corrupted file → see clear error
5. Network failure during generation → retry works

**Fix any bugs found**

#### 8.2 Performance Optimization

**Check:**
- Initial page load < 2 seconds
- Transcript processing < 5 minutes
- No memory leaks (check browser dev tools)
- Images optimized
- Code splitting (lazy load routes)

#### 8.3 Documentation

**Create:**
- `/docs/USER_GUIDE.md` - How to use the app
- Update README.md with:
  - How to deploy
  - Environment variables needed
  - Known issues

#### 8.4 LiveData Onboarding

**Prepare:**
- Create LiveData account
- Upload their brand guide
- Process one sample transcript
- Generate shareable link

**Validation checkpoint:**
→ Hand off to LiveData marketing: "Here's the app, here's your login, try it with a real webinar transcript"

---

## Deployment Checklist

Before considering it "done":

- [ ] All environment variables set in Vercel
- [ ] Database migrations run in production Supabase
- [ ] Default templates seeded
- [ ] Error tracking configured (optional for MVP)
- [ ] Usage limits working
- [ ] Authentication secure (no API keys exposed)
- [ ] HTTPS enforced
- [ ] Responsive on mobile
- [ ] Tested in Chrome, Safari, Firefox
- [ ] LiveData marketing can use it successfully

---

## When to Ask Human for Input

**DO ask human:**
- "Here's the brand voice profile generated from your document. Does this capture your style?" (Phase 2)
- "I've generated content from your transcript. Does it match your expectations?" (Phase 5)
- "The app is deployed. Can you test the complete flow?" (Phase 8)
- "I'm stuck on [specific technical issue]. Can you help clarify?" (anytime)

**DON'T ask human:**
- "Should I use React Query or plain fetch?" (you decide based on spec)
- "What color should the buttons be?" (use Tailwind defaults, professional blue)
- "How should I structure this component?" (you decide)
- "Which database query is more efficient?" (you optimize)

---

## Success Criteria

**You're done when:**
1. User can sign up, onboard, upload transcript, generate content, download it
2. Content quality is good (tested with real LiveData transcript)
3. No major bugs in critical paths
4. Deployed and accessible via URL
5. LiveData marketing can use it for real work

**Human will validate:**
- Product usability
- Content quality
- Brand voice accuracy

**You handle:**
- All technical decisions
- All code
- All deployment
- All bug fixes

---

## Getting Help

**If you're stuck:**

1. Check the specs:
   - `/docs/PRD.md` for product requirements
   - `/docs/TECHNICAL_SPEC.md` for architecture
   - `/prompts/` for exact AI prompts to use

2. Check examples:
   - Supabase docs: https://supabase.com/docs
   - Anthropic docs: https://docs.anthropic.com
   - React docs: https://react.dev

3. Ask human only if:
   - Requirement is ambiguous
   - Need API credentials
   - Blocking technical issue you can't resolve

---

## Timeline Summary

| Phase | Days | Deliverable |
|-------|------|-------------|
| 1. Foundation | 1-3 | Auth working, deployed |
| 2. Brand Voice | 4-6 | Onboarding complete |
| 3. Transcript Upload | 7-9 | Can upload, extract text |
| 4. Content Selection | 10-11 | Select types, tone |
| 5. Content Generation | 12-16 | Actually generates content |
| 6. Content Library | 17-20 | View, copy, download |
| 7. Limits & Polish | 21-23 | Usage limits, error handling |
| 8. Testing & Launch | 24-28 | Ready for real use |

**Total: ~4 weeks**

---

**Now:** Begin Phase 1. Set up the project, create database tables, build authentication, and deploy a basic version.

Ask the human for Supabase and Anthropic API credentials when ready.