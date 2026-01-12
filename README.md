# AI Content Repurposing Engine - MVP

Transform long-form content (webinars, podcasts, transcripts) into multiple derivative pieces while maintaining your brand voice.

## Quick Start

**For Claude Code:**
1. Read `/docs/IMPLEMENTATION_GUIDE.md`
2. Follow phases autonomously
3. Ask human for validation at end of each phase

**For Product Owner (You):**
1. Review `/docs/PRD.md` for product vision
2. Check `/docs/TECHNICAL_SPEC.md` for architecture decisions
3. Test at end of each phase when Claude Code asks
4. Provide product feedback, not technical direction

## Project Structure
```
/docs/                      # Product & technical documentation
/prompts/                   # AI prompts (ready to use in code)
/database/                  # Schema & migrations
/src/                       # Source code (Claude Code builds this)
  /core/                    # Business logic (infrastructure-agnostic)
  /infrastructure/          # External services (can be swapped)
  /api/                     # Routes & endpoints
/testing/                   # Test scenarios & data
```

## Current Status

**Phase:** Not started
**Last Updated:** 2025-01-11

## Stack

- **Frontend:** React + Tailwind (Vercel)
- **Database:** Supabase (Postgres)
- **AI:** Claude API (Anthropic)
- **File Processing:** Edge Functions

## Environment Variables Needed
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Success Metrics (MVP)

- [ ] LiveData marketing processes 4+ transcripts in first month
- [ ] Generated content requires <30% editing
- [ ] User returns weekly for 4+ consecutive weeks
- [ ] User would pay $300/month

## License

Proprietary - Internal use only