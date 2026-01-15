# Claude Code: LinkedIn Enhancement Implementation

## Core Directive

Implement LinkedIn publishing and analytics features into the existing Content Amplifier codebase. This is **integration work** - adapt to existing patterns, don't create parallel architecture.

---

## Pre-Implementation (CRITICAL - DO THIS FIRST)

### 1. Read All Documentation
- `PRD.md` - Product vision and existing features
- `TECHNICAL_SPEC.md` - Current architecture and patterns
- `IMPLEMENTATION_GUIDE.md` - Coding standards and conventions
- `ENHANCEMENT_CONCISE.md` - New features to add

### 2. Analyze Existing Codebase
Answer these questions:
- What backend framework? (FastAPI, Flask, Django, etc.)
- How are API endpoints organized?
- What database and ORM?
- How is authentication handled?
- How are services/business logic structured?
- Is there a background job system? (Celery, RQ, APScheduler, etc.)
- What frontend framework?
- How are components organized?
- What testing framework and patterns?
- How is observability done? (logging, metrics, errors)

### 3. Create Integration Plan
Before coding, document:
- Which existing files to modify
- Which new files to create
- How new features connect to existing architecture
- Database migration strategy
- How to maintain backward compatibility

---

## Implementation Principles

**DO**:
✅ Follow existing code style, naming conventions, file structure
✅ Use existing patterns for auth, database, APIs, services
✅ Integrate features into existing flows (don't build separately)
✅ Add logging/metrics consistent with existing observability
✅ Write tests matching existing test structure
✅ Encrypt sensitive data (OAuth tokens)
✅ Handle errors gracefully with retries
✅ Ask for clarification if patterns are unclear

**DON'T**:
❌ Create parallel architecture or new patterns without reason
❌ Break existing functionality
❌ Use different coding style
❌ Skip tests
❌ Store tokens unencrypted
❌ Ignore error handling
❌ Build features in isolation

---

## Key Technical Points

**Text-Only Publishing**:
- LinkedIn API publishes TEXT ONLY (no images)
- Clear user messaging: "Images added in LinkedIn after posting"
- After publish: notify with link to edit post on LinkedIn
- Users add media in ~30 seconds

**Background Jobs**:
- If no job system exists, add Celery or APScheduler (whichever fits existing stack)
- publish_scheduled_posts: runs every minute
- fetch_linkedin_metrics: runs daily
- generate_insights: runs weekly

**OAuth Tokens**:
- MUST encrypt before database storage
- Auto-refresh when expired
- Never log tokens

**Content Calendar**:
- Primary UI for managing LinkedIn posts
- Visual planning tool (month/week views)
- Drag-and-drop rescheduling
- Shows gaps and optimal posting times

---

## Implementation Sequence

Implement in order:
1. **Phase 1.1** - LinkedIn OAuth connection
2. **Phase 1.2** - Content editing capability  
3. **Phase 1.3** - Publishing (text-only, with scheduling)
4. **Phase 1.4** - Content calendar (visual schedule)
5. **Phase 1.5** - Publishing management (list view)
6. **Phase 2.1** - Metrics collection (background job)
7. **Phase 2.2** - Analytics dashboard
8. **Phase 2.3** - Performance insights (AI-powered)
9. **Phase 2.4** - Content suggestions (AI-powered)

**After each phase**: Test thoroughly, verify integration, update docs if needed.

---

## Observability Requirements

For every new feature, add:
- **Logging**: OAuth events, publishing events, metrics fetching, errors
- **Metrics**: Success/failure rates, API costs, user engagement
- **Alerts**: Publishing failures, API errors, cost anomalies

Follow existing observability patterns.

---

## When to Ask for Guidance

Ask before proceeding if:
- Existing patterns are ambiguous or contradictory
- Major architectural decision needed (e.g., which background job system to add)
- Potential breaking change to existing features
- Security concern about token storage or API usage
- Uncertainty about how to integrate with existing code

---

## Output Format

For each phase:
1. **Analysis**: "Found existing patterns: [summary]"
2. **Plan**: "Will modify [files], create [files], integrate by [approach]"
3. **Implementation**: Code changes
4. **Tests**: Test code matching existing patterns
5. **Verification**: "Tested, integrated, backward compatible"

---

## Start Command

**Ready to begin?**

```
Analyze the codebase structure and create an integration plan for Phase 1.1: 
LinkedIn OAuth Connection. Show how it will fit into existing authentication 
and data storage patterns. Wait for approval before implementing.
```

Then proceed phase by phase, testing each before moving to the next.

---

**Remember**: You're enhancing an existing app, not building a new one. Existing patterns are your guide.
