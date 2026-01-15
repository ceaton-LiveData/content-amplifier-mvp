# LinkedIn Publishing & Analytics Enhancement

**Version**: 1.0 | **Date**: January 14, 2026

## Overview

Add LinkedIn-first publishing and analytics to Content Amplifier. Transform from content generation tool to complete LinkedIn growth engine.

**Core Value**: Generate content → Edit → Schedule in calendar → Auto-publish text → Add images in LinkedIn → Track performance → Get insights

---

## Phase 1: Publishing & Calendar (Weeks 1-4)

### 1.1 LinkedIn OAuth Connection

**Requirements**:
- OAuth 2.0 flow (scopes: `r_liteprofile`, `r_emailaddress`, `w_member_social`, `r_organization_social`)
- Store encrypted tokens (access + refresh)
- Auto token refresh
- Connection status UI
- Disconnect option

**Data Model**:
```
platform_connections: user_id, platform, access_token (encrypted), 
refresh_token (encrypted), token_expires_at, platform_user_id, 
connection_status, last_sync_at
```

---

### 1.2 Content Editing

**Requirements**:
- Inline editor for generated variants
- Real-time character count (3,000 LinkedIn limit, recommend 1,300)
- Save edited version (track original + edited)
- Track: was_edited, edit_count, edit magnitude

**Data Model Enhancement**:
```
content_variants: add fields for edited_text, was_edited, edit_count, 
last_edited_at
```

---

### 1.3 LinkedIn Publishing (Text-Only)

**Critical**: TEXT-ONLY publishing. Users add images/media in LinkedIn after.

**Requirements**:
- Publish now or schedule for future
- Background job checks every minute for scheduled posts
- Auto-retry failed posts (3 attempts, exponential backoff)
- After publish: notification with link "Posted! Add images: [View on LinkedIn]"
- Store LinkedIn post URN and URL for metrics

**Data Model**:
```
scheduled_posts: user_id, content_variant_id, platform, scheduled_time, 
timezone, status (pending|publishing|published|failed|cancelled), 
platform_post_id, platform_post_url, retry_count, error_message, 
published_at, notification_sent
```

**LinkedIn API**:
- Endpoint: `POST /v2/ugcPosts`
- shareMediaCategory: "NONE" (text only)
- Rate limit: 100 posts/day/user
- Response: URN and URL for tracking

**Background Job**: Runs every minute, publishes scheduled posts, sends notifications, retries failures

---

### 1.4 Content Calendar

**Requirements**:
- Month and week view toggle
- Show: scheduled posts (blue), published posts (green), failed posts (red)
- Visual indicators: gaps (gray), optimal times (gold star)
- Each post shows: preview (50 chars), date/time, status, performance (if published)
- Drag-and-drop to reschedule
- Click to edit/delete/view on LinkedIn
- Filter by status

**Key Features**:
- Identify posting gaps
- Highlight optimal posting times (from analytics)
- "Add Post" button for empty slots
- Mobile responsive

---

### 1.5 Publishing Management

**Requirements**:
- List view (alternative to calendar)
- Filter: status, date range
- Search: by content keywords
- Sort: date, performance, status
- Bulk actions: delete, reschedule
- Per-post actions: edit, cancel, retry, view on LinkedIn, duplicate

---

## Phase 2: Analytics & Insights (Weeks 5-8)

### 2.1 Metrics Collection

**Requirements**:
- Auto-fetch from LinkedIn API daily (first 7 days), weekly (8-30 days)
- Metrics: impressions, unique_impressions, engagements, clicks, reactions breakdown, comments, shares
- Calculate: engagement_rate (engagements / impressions)
- Store time-series (snapshots)

**Data Model**:
```
post_metrics: variant_id, user_id, platform, impressions, 
unique_impressions, engagements, clicks, likes, comments, shares, 
reaction_breakdown (JSON), engagement_rate, snapshot_date, 
fetched_at, is_final
```

**Background Job**: Runs daily, fetches metrics for all published posts

---

### 2.2 Analytics Dashboard

**Requirements**:
- Overview: total impressions, avg engagement rate, posts published, top performers
- Date range selector (7/30/90 days, all time)
- Compare to previous period
- Charts: impressions over time, engagement over time
- Post performance table (sortable, filterable)
- Individual post detail view
- Cache aggregated data (refresh hourly)

---

### 2.3 Performance Insights

**Requirements**:
- AI-powered analysis of posting patterns (requires 10+ posts)
- Insight types:
  - Hook optimization: "Question-based posts get 2.3x engagement"
  - Timing: "Tuesday 9am gets 40% more impressions"
  - Length: "1,000-1,200 chars is your sweet spot"
  - Format: "Tactical how-to gets 4x comments"
  - Themes: "AI in healthcare performs best"
- Weekly generation
- Prioritize by confidence and impact
- User actions: dismiss, act on (opens content generator)

**Data Model**:
```
insights: user_id, insight_type (hook|timing|format|theme|pattern), 
insight_message, supporting_data (JSON), confidence_score, priority, 
status (active|dismissed|acted_on), generated_at, expires_at
```

**Background Job**: Runs weekly, generates 3-5 insights per user

---

### 2.4 Content Suggestions

**Requirements**:
- AI-generated topic suggestions (3-5 per week)
- Based on: posting history, network trends, gaps, user expertise
- Each suggestion: topic, rationale, format, estimated reach, best time
- "Use this idea" → opens content generator pre-filled

**Data Model**:
```
content_suggestions: user_id, suggestion_text, rationale, 
suggested_format, estimated_performance, status (new|used|dismissed), 
generated_at
```

**Background Job**: Runs weekly

---

## Technical Requirements

### Background Jobs
1. **publish_scheduled_posts** (every minute) - Publish + notify
2. **fetch_linkedin_metrics** (daily) - Collect performance data
3. **generate_insights** (weekly) - Analyze patterns
4. **generate_suggestions** (weekly) - Create topic ideas

### Security
- Encrypt OAuth tokens at rest
- Never log tokens
- Secure token refresh
- User can revoke anytime

### Observability
- Log: OAuth events, publishing events, metrics fetching, insight generation
- Track: publish success/failure rate, metrics accuracy, insight usage
- Alert: publishing failures, API errors, cost anomalies

### Cost Management
- LinkedIn API is free (100 posts/day limit)
- Track AI costs for insights/suggestions
- Monitor API rate limits

---

## Integration Notes

**Fits into existing flow**:
- Content generation → (new: editing) → (new: schedule in calendar) → (new: auto-publish) → (new: analytics)

**Navigation**:
- Add "Calendar" as primary view (default for LinkedIn section)
- Add "Analytics" and "Insights" tabs

**User messaging**:
- Clear communication: "Text publishes automatically. Add images in LinkedIn afterward."
- Post-publish notification essential for user to add media

---

## Success Metrics

**Phase 1**:
- 70%+ connect LinkedIn
- 80%+ use calendar
- 60%+ schedule posts
- 95%+ publish success rate

**Phase 2**:
- 60%+ view analytics weekly
- 30%+ act on insights
- 40%+ engagement rate improvement after 30 days
- 70%+ improve engagement after using insights

---

## Out of Scope

**NOT building**:
- Image/video upload (users add in LinkedIn)
- Rich media embedding (GIFs, polls, documents)
- LinkedIn carousel image generation
- LinkedIn Articles
- Twitter integration
- Team collaboration features

**Philosophy**: Focus on content generation, strategic scheduling, and analytics. LinkedIn handles rich media publishing.

---

## Implementation Order

1. LinkedIn OAuth (1.1)
2. Content Editing (1.2)
3. Publishing - text only (1.3)
4. Content Calendar (1.4)
5. Publishing Management (1.5)
6. Metrics Collection (2.1)
7. Analytics Dashboard (2.2)
8. Insights (2.3)
9. Suggestions (2.4)

**Start**: Phase 1.1, build incrementally, test thoroughly.
