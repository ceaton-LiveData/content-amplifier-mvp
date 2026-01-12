# Technical Specification: AI Content Repurposing Engine

**Version:** 1.0 MVP  
**Last Updated:** 2025-01-11  
**Architecture:** Migration-ready, infrastructure-agnostic core

---

## Architecture Philosophy

**Key Principles:**
1. **Separation of concerns:** Business logic separate from infrastructure
2. **Migration-ready:** Can move from Supabase to AWS without rewriting core
3. **Interface-driven:** All external services behind interfaces
4. **Scalable foundation:** Handles 1-1000 customers without changes

**What this means:**
- Core business logic (content generation, brand analysis) works with ANY database
- Infrastructure layer (Supabase, Vercel) can be swapped
- Data model is pure Postgres (not Supabase-specific)

---

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────┐
│                 Browser (Client)                    │
│              React App + Tailwind                   │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ HTTPS
                  ↓
┌─────────────────────────────────────────────────────┐
│              Vercel (Frontend Host)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  Static Assets (HTML/JS/CSS)                  │  │
│  │  CDN-distributed globally                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ API Calls
                  ↓
┌─────────────────────────────────────────────────────┐
│              Supabase (Backend)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                          │  │
│  │  - User accounts                              │  │
│  │  - Brand voices                               │  │
│  │  - Transcripts                                │  │
│  │  - Generated content                          │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Authentication (Built-in)                    │  │
│  │  - Email/password                             │  │
│  │  - JWT tokens                                 │  │
│  │  - Row-level security                         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Storage (Built-in)                           │  │
│  │  - Uploaded brand documents                   │  │
│  │  - Uploaded transcripts (temp)                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Edge Functions (Serverless)                  │  │
│  │  - process_transcript()                       │  │
│  │  - analyze_brand_voice()                      │  │
│  │  - generate_content()                         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ API Calls
                  ↓
┌─────────────────────────────────────────────────────┐
│            External Services                        │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  Claude API      │  │  Future: AssemblyAI     │ │
│  │  (Content Gen)   │  │  (Transcription)        │ │
│  └──────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

### Application Architecture (Code Structure)

**Layered architecture for migration-readiness:**
```
/src/
├── /core/                          # Business logic (infrastructure-agnostic)
│   ├── /brand-voice/
│   │   ├── analyzer.js             # Analyzes examples → profile
│   │   └── validator.js            # Validates profile quality
│   ├── /content-generation/
│   │   ├── generator.js            # Core generation logic
│   │   ├── template-engine.js      # Template processing
│   │   └── prompt-builder.js       # Constructs Claude prompts
│   └── /processing/
│       ├── text-extractor.js       # Extract text from files
│       └── transcript-processor.js  # Clean/prepare transcripts
│
├── /infrastructure/                # External services (swappable)
│   ├── /database/
│   │   ├── interface.js            # Database interface definition
│   │   └── supabase.js             # Supabase implementation
│   ├── /storage/
│   │   ├── interface.js            # Storage interface definition
│   │   └── supabase-storage.js     # Supabase Storage implementation
│   ├── /ai/
│   │   ├── interface.js            # AI provider interface
│   │   └── claude.js               # Claude API implementation
│   └── /auth/
│       ├── interface.js            # Auth interface definition
│       └── supabase-auth.js        # Supabase Auth implementation
│
├── /api/                           # API routes/endpoints
│   ├── auth.js                     # Login, signup, logout
│   ├── brand-voice.js              # Brand voice CRUD
│   ├── transcripts.js              # Upload, process transcripts
│   └── content.js                  # Generated content CRUD
│
├── /ui/                            # React components
│   ├── /components/                # Reusable UI components
│   ├── /pages/                     # Page-level components
│   └── /hooks/                     # Custom React hooks
│
└── /utils/                         # Shared utilities
    ├── errors.js                   # Error handling
    ├── validation.js               # Input validation
    └── config.js                   # Configuration management
```

**Why this structure:**

1. **`/core/`** - Pure business logic
   - No imports from `/infrastructure/`
   - Works with any database, storage, AI provider
   - 100% unit testable without external services

2. **`/infrastructure/`** - External service implementations
   - Each service has an `interface.js` defining the contract
   - Implementations can be swapped (Supabase → AWS RDS)
   - Only this layer knows about Supabase, Claude API, etc.

3. **`/api/`** - Glue layer
   - Connects core logic to infrastructure
   - Handles HTTP concerns (request/response)
   - Routes to appropriate core functions

---

## Data Model (Infrastructure-Agnostic)

**Pure Postgres schema - works on any Postgres database:**

### Entity Relationship Diagram
```
┌─────────────┐
│   users     │ (Supabase auth.users)
└──────┬──────┘
       │
       │ 1:1
       ↓
┌─────────────────────────┐
│      accounts           │
│  - brand_voice_profile  │
│  - target_audience      │
│  - usage tracking       │
└──────┬──────────────────┘
       │
       │ 1:N
       ↓
┌─────────────────────────┐
│  content_sources        │
│  - transcript_text      │
│  - original_filename    │
└──────┬──────────────────┘
       │
       │ 1:N
       ↓
┌─────────────────────────┐
│  content_generations    │
│  - selected_types       │
│  - tone_override        │
│  - status               │
└──────┬──────────────────┘
       │
       │ 1:N
       ↓
┌─────────────────────────┐
│  generated_content      │
│  - content_type         │
│  - content_text         │
│  - metadata             │
└─────────────────────────┘
```

### Tables & Fields

**See `/database/schema.sql` for complete SQL**

Key tables:
- `accounts` - One per user, holds brand voice
- `content_sources` - Uploaded transcripts
- `content_generations` - Each generation job
- `generated_content` - Individual content pieces
- `content_templates` - Reusable templates (system + custom)

---

## Technology Stack

### Current Implementation (MVP)

| Layer | Technology | Why | Migration Path |
|-------|-----------|-----|----------------|
| **Frontend** | React + Vite | Fast dev, Claude Code familiar | Keep (maybe add Next.js later) |
| **Styling** | Tailwind CSS | Rapid UI dev, utility-first | Keep |
| **Hosting (Frontend)** | Vercel | Zero-config deploy, CDN, serverless | Keep or add Cloudflare |
| **Database** | Supabase (Postgres) | Managed Postgres, auth included | Migrate to AWS RDS when needed |
| **Auth** | Supabase Auth | Built-in, handles JWT, RLS | Migrate to Auth0 or custom |
| **Storage** | Supabase Storage | Files, built-in | Migrate to S3 |
| **Backend Functions** | Supabase Edge Functions | Serverless, Deno runtime | Migrate to AWS Lambda |
| **AI** | Claude 3.5 Sonnet (API) | Best quality for content | Keep |
| **Text Extraction** | mammoth, pdf-parse | Standard libraries | Keep |

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (server-side only)

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# App Config
NODE_ENV=development|production
APP_URL=https://app.example.com
```

---

## Infrastructure Interfaces

**How we abstract external services for migration-readiness:**

### Database Interface
```javascript
// /infrastructure/database/interface.js

/**
 * Database interface - any implementation must provide these methods
 * Currently: Supabase Postgres
 * Future: AWS RDS, PlanetScale, etc.
 */

export interface Database {
  // Accounts
  async getAccount(userId: string): Account
  async updateAccount(userId: string, data: Partial<Account>): Account
  
  // Content Sources
  async createContentSource(accountId: string, data: ContentSourceInput): ContentSource
  async getContentSource(id: string): ContentSource
  async listContentSources(accountId: string): ContentSource[]
  
  // Content Generations
  async createGeneration(data: GenerationInput): Generation
  async updateGeneration(id: string, data: Partial<Generation>): Generation
  async getGeneration(id: string): Generation
  
  // Generated Content
  async saveGeneratedContent(data: GeneratedContentInput[]): GeneratedContent[]
  async getGeneratedContent(generationId: string): GeneratedContent[]
  async listContentBySource(sourceId: string): GeneratedContent[]
  
  // Templates
  async getTemplates(accountId: string): Template[]
  async createTemplate(accountId: string, data: TemplateInput): Template
}
```

**Current implementation:** `/infrastructure/database/supabase.js`

**Future implementations:**
- `/infrastructure/database/aws-rds.js`
- `/infrastructure/database/planetscale.js`

**Switching databases:**
Just change one import in `/api/` files. Core logic unchanged.

---

### Storage Interface
```javascript
// /infrastructure/storage/interface.js

export interface Storage {
  // Upload file, return URL
  async upload(file: File, path: string): string
  
  // Download file, return buffer
  async download(url: string): Buffer
  
  // Delete file
  async delete(url: string): void
  
  // Get signed URL (temporary access)
  async getSignedUrl(url: string, expiresIn: number): string
}
```

**Current:** Supabase Storage  
**Future:** AWS S3, Cloudflare R2

---

### AI Interface
```javascript
// /infrastructure/ai/interface.js

export interface AIProvider {
  // Generate content with prompt
  async generate(prompt: string, options: GenerateOptions): string
  
  // Generate with structured output
  async generateStructured(prompt: string, schema: JSONSchema): object
  
  // Calculate cost estimate
  estimateCost(inputTokens: number, outputTokens: number): number
}

interface GenerateOptions {
  model: string
  maxTokens: number
  temperature?: number
  systemPrompt?: string
  cacheSystemPrompt?: boolean // For prompt caching
}
```

**Current:** Claude API (Anthropic)  
**Future:** Could add GPT-4, self-hosted models, etc.

---

## Core Business Logic (Infrastructure-Agnostic)

### Brand Voice Analysis

**Location:** `/core/brand-voice/analyzer.js`

**Purpose:** Analyze example content → generate brand voice profile

**Function signature:**
```javascript
/**
 * Analyze brand voice from examples or document
 * @param {string[]} examples - Array of example content
 * @param {string} targetAudience - Who they're writing for
 * @param {string} wordsToAvoid - Optional words to avoid
 * @returns {string} Brand voice profile (2-3 paragraphs)
 */
async function analyzeBrandVoice(examples, targetAudience, wordsToAvoid)
```

**Key logic:**
1. Combine examples into analysis prompt
2. Include target audience context
3. Call AI provider (via interface)
4. Parse/validate output
5. Return brand voice profile text

**No infrastructure dependencies** - only uses AI interface

---

### Content Generation Engine

**Location:** `/core/content-generation/generator.js`

**Purpose:** Generate content pieces from transcript + brand voice

**Function signature:**
```javascript
/**
 * Generate content from transcript
 * @param {string} transcript - Full transcript text
 * @param {string} brandVoice - Brand voice profile
 * @param {string[]} contentTypes - Types to generate
 * @param {object} options - Tone, templates, etc.
 * @returns {GeneratedContent[]} Array of generated content pieces
 */
async function generateContent(transcript, brandVoice, contentTypes, options)
```

**Process:**
1. For each content type selected:
   a. Get template for that type
   b. Build prompt (transcript + brand voice + template requirements)
   c. Call AI provider
   d. Parse and structure response
   e. Store result
2. Return all generated content

**Template-driven:** Uses templates from database, fully configurable

---

### Template Engine

**Location:** `/core/content-generation/template-engine.js`

**Purpose:** Build AI prompts from templates

**Templates define:**
- Content structure
- Length requirements
- Tone adjustments
- Specific requirements

**Example template (LinkedIn Post):**
```javascript
{
  template_name: 'linkedin_post',
  config: {
    count: 5,
    length: '150-200 words',
    structure: 'Hook → Insight → CTA',
    requirements: [
      'Start with attention-grabbing hook',
      'Include specific data point',
      'End with engagement question',
      'Use short paragraphs (1-3 sentences)'
    ]
  }
}
```

**Prompt builder uses template to construct:**
```
Generate a LinkedIn post from this content.

BRAND VOICE:
{brandVoiceProfile}

STRUCTURE: Hook → Insight → CTA
LENGTH: 150-200 words
REQUIREMENTS:
- Start with attention-grabbing hook
- Include specific data point
- End with engagement question
- Use short paragraphs (1-3 sentences)

TONE: {toneAdjustment}

SOURCE CONTENT:
{transcriptExcerpt}

Generate the post:
```

---

## Processing Pipeline

### Transcript Upload → Content Generation
```
1. User uploads file
   ↓
2. Extract text from file (PDF/DOCX/TXT/VTT/SRT)
   ↓
3. Store transcript in database
   ↓
4. User selects content types + tone
   ↓
5. Create generation job (status: pending)
   ↓
6. For each content type:
   a. Get template
   b. Build prompt
   c. Call Claude API
   d. Parse response
   e. Save generated content
   f. Update progress
   ↓
7. Mark generation complete
   ↓
8. Notify user (UI update)
```

**Handled by:** Supabase Edge Function `generate_content()`

**Execution time:**
- LinkedIn posts (5): ~30 sec
- Blog post: ~45 sec
- Email sequence: ~30 sec
- Twitter thread: ~15 sec
- Executive summary: ~15 sec
- **Total: ~2.5 minutes**

**Error handling:**
- Retry failed API calls (3 attempts)
- Log errors to database
- Show clear error to user
- Allow regeneration

---

## API Design

### RESTful Endpoints

**Authentication: JWT token in Authorization header**

#### Auth Endpoints
```
POST   /api/auth/signup           # Create account
POST   /api/auth/login            # Get JWT token
POST   /api/auth/logout           # Invalidate token
GET    /api/auth/me               # Get current user
```

#### Brand Voice
```
POST   /api/brand-voice           # Analyze and save brand voice
GET    /api/brand-voice           # Get current brand voice
PUT    /api/brand-voice           # Update brand voice
```

#### Transcripts
```
POST   /api/transcripts           # Upload transcript
GET    /api/transcripts           # List user's transcripts
GET    /api/transcripts/:id       # Get specific transcript
DELETE /api/transcripts/:id       # Delete transcript
```

#### Content Generation
```
POST   /api/generate              # Start generation job
GET    /api/generations/:id       # Get generation status
GET    /api/generations/:id/content  # Get generated content
POST   /api/regenerate/:id        # Regenerate with different settings
```

#### Content Management
```
GET    /api/content               # List all generated content
GET    /api/content/:id           # Get specific content piece
PUT    /api/content/:id           # Update content (edits)
DELETE /api/content/:id           # Delete content
```

**Error responses:**
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional context
}
```

---

## Security

### Authentication & Authorization

**Authentication:** Supabase Auth (JWT tokens)
- Email/password authentication
- Tokens expire after 1 hour
- Refresh token flow for extended sessions

**Authorization:** Row-Level Security (RLS)

**RLS Policies:**
```sql
-- Users can only see their own account
CREATE POLICY "Users see own account" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create/modify their own content sources
CREATE POLICY "Users manage own sources" ON content_sources
  FOR ALL USING (account_id IN (
    SELECT id FROM accounts WHERE user_id = auth.uid()
  ));

-- Similar policies for all tables
```

**API Key Storage:**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Never expose `ANTHROPIC_API_KEY` to client
- Use environment variables (not committed to git)
- Rotate keys regularly

### Data Privacy

**User data:**
- Transcripts contain potentially sensitive business info
- Brand voice examples may contain proprietary content
- Generated content belongs to user

**Compliance:**
- Store all data encrypted at rest (Supabase default)
- Use HTTPS everywhere (enforced)
- Allow users to delete all their data
- No selling or sharing user data

**Future considerations:**
- GDPR compliance (data export, right to deletion)
- SOC 2 certification (if enterprise customers)
- Data residency options (EU, US regions)

---

## Performance & Scalability

### Current Capacity

**With Supabase + Vercel (MVP stack):**

| Metric | Capacity | When to Scale |
|--------|----------|---------------|
| Concurrent users | 100-500 | Need load balancing at 500+ |
| Database connections | 60 (Supabase free) | Upgrade to Pro at 30+ active users |
| Storage | 1GB (free) | Upgrade at ~500 transcripts |
| Edge Function executions | 500K/month (free) | Upgrade at ~5K generations/month |
| Bandwidth | 2GB/month (free) | Upgrade at ~100 active users |

**Cost at scale:**

**10 customers:**
- Supabase: $0 (free tier)
- Vercel: $0 (free tier)
- Claude API: ~$50/month
- **Total: $50/month**

**100 customers:**
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- Claude API: ~$500/month
- **Total: $545/month**

**1,000 customers:**
- Supabase Team: $599/month
- Vercel Pro: $20/month
- Claude API: ~$5,000/month
- **Total: $5,619/month**
- **Revenue: $300K/month**
- **Margin: 98%**

### Optimization Strategies

**Caching:**
- Brand voice profiles cached in Claude API calls (90% cost reduction on repeated use)
- Static assets CDN-cached via Vercel
- Database query results cached client-side (React Query)

**Rate Limiting:**
- 10 transcripts/month per user (free tier)
- Prevents abuse, controls costs
- Graceful degradation when limits hit

**Lazy Loading:**
- Only load content when user views it
- Paginate transcript lists
- Defer non-critical API calls

**Future optimizations (when needed):**
- Database read replicas
- Dedicated Redis for caching
- CDN for user-generated content
- Self-hosted AI inference (cost reduction)

---

## Monitoring & Observability

### Key Metrics to Track

**System Health:**
- API response times
- Error rates by endpoint
- Database query performance
- Edge Function cold starts

**Business Metrics:**
- Transcripts processed/day
- Content pieces generated/day
- User signups
- Usage by tier

**Cost Metrics:**
- Claude API spend/day
- Supabase usage (connections, storage)
- Vercel bandwidth

### Tools (Post-MVP)

**Error tracking:** Sentry
**Analytics:** PostHog or Mixpanel
**Logs:** Supabase built-in + Datadog
**Uptime:** UptimeRobot

**MVP:** Just Supabase dashboard + manual cost tracking

---

## Migration Path (Supabase → AWS)

**When to migrate:** $3M+ ARR, need more control/cost optimization

**Migration strategy:**

### Phase 1: Dual-write
- Write to both Supabase and AWS RDS
- Read from Supabase (verified system)
- Validate AWS data matches

### Phase 2: Dual-read
- Write to both
- Read from AWS RDS
- Supabase as backup

### Phase 3: Full migration
- Stop writing to Supabase
- Decommission Supabase
- 100% on AWS

**What changes:**
- `/infrastructure/database/supabase.js` → `/infrastructure/database/aws-rds.js`
- `/infrastructure/storage/supabase-storage.js` → `/infrastructure/storage/s3.js`
- `/infrastructure/auth/supabase-auth.js` → `/infrastructure/auth/cognito.js`

**What doesn't change:**
- `/core/` - All business logic stays the same
- `/ui/` - Frontend unchanged
- `/api/` - Minimal changes (just import different infrastructure)

**Estimated migration time:** 2-4 weeks with 1-2 engineers

---

## Development Workflow

### Local Development
```bash
# 1. Clone repo
git clone <repo>
cd content-repurposing-mvp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with actual keys

# 4. Run database migrations
npm run db:migrate

# 5. Seed default templates
npm run db:seed

# 6. Start dev server
npm run dev

# App runs at http://localhost:5173
```

### Testing

**MVP:** Manual testing only

**Post-MVP:** Add automated tests
- Unit tests: Core business logic
- Integration tests: API endpoints
- E2E tests: Critical user flows

### Deployment

**Automatic via Vercel:**
- Push to `main` branch → deploys to production
- Push to any other branch → deploys preview environment
- Supabase migrations run automatically

**Environment separation:**
- Development: Local Supabase + local dev server
- Staging: Staging Supabase project + Vercel preview
- Production: Production Supabase + Vercel production

---

## Open Technical Questions

1. **File size limits:** 25MB enough or increase to 50MB?
2. **Concurrent generation limits:** Allow multiple simultaneous generations or queue?
3. **Content versioning:** Keep all versions or just latest + previous?
4. **Database backups:** Supabase handles this, but separate backup strategy?
5. **Monitoring threshold:** When to add Sentry? (after X users or errors)

---

## Appendix: Technology Alternatives Considered

| Need | Chosen | Alternatives Considered | Why Not |
|------|--------|------------------------|---------|
| Database | Supabase (Postgres) | Firebase, PlanetScale, AWS RDS | Supabase has auth+storage+functions built-in |
| Auth | Supabase Auth | Auth0, Clerk, Firebase Auth | Already included, good enough |
| Hosting | Vercel | Netlify, Railway, Render | Best DX for React, automatic CDN |
| AI | Claude 3.5 Sonnet | GPT-4, Llama, Gemini | Best quality for long-form content |
| Frontend | React | Next.js, Vue, Svelte | Claude Code most familiar, widely known |

---

**Document Status:** Final v1.0  
**Last Updated:** 2025-01-11  
**Owner:** Chris (Product) + Claude Code (Implementation)