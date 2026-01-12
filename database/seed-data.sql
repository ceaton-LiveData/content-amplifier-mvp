-- Seed Data for Content Amplifier MVP
-- Default content templates
-- Last Updated: 2025-01-11

-- ============================================================================
-- DEFAULT CONTENT TEMPLATES
-- These are system templates available to all users
-- ============================================================================

-- LinkedIn Post Template
INSERT INTO content_templates (id, account_id, template_name, is_default, config)
VALUES (
  uuid_generate_v4(),
  NULL, -- NULL account_id means this is a system template
  'linkedin_post',
  true,
  '{
    "count": 5,
    "length": "150-200 words",
    "structure": "Hook → Insight → Call-to-action",
    "requirements": [
      "Start with an attention-grabbing hook",
      "Include at least one specific data point or statistic",
      "End with a question to drive engagement",
      "Use short paragraphs (1-3 sentences each)",
      "No hashtags (user can add later)"
    ],
    "tone_modifier": "Professional but conversational, suitable for LinkedIn"
  }'::jsonb
);

-- Blog Post Template
INSERT INTO content_templates (id, account_id, template_name, is_default, config)
VALUES (
  uuid_generate_v4(),
  NULL,
  'blog_post',
  true,
  '{
    "count": 1,
    "length": "800-1200 words",
    "structure": "Introduction (problem/context) → Main sections (2-4 key points) → Practical takeaways → Conclusion",
    "requirements": [
      "SEO-friendly title (60 characters or less)",
      "Clear section headers using ## markdown",
      "Include 2-3 specific examples or case studies from the content",
      "Actionable takeaways section",
      "Conversational but professional tone"
    ],
    "tone_modifier": "Educational and authoritative, more formal than LinkedIn"
  }'::jsonb
);

-- Email Sequence Template
INSERT INTO content_templates (id, account_id, template_name, is_default, config)
VALUES (
  uuid_generate_v4(),
  NULL,
  'email_sequence',
  true,
  '{
    "count": 5,
    "length": "100-150 words per email",
    "structure": "Email 1: Problem introduction → Emails 2-4: Educational value → Email 5: Soft CTA",
    "requirements": [
      "Each email needs a compelling subject line",
      "Start each email with a personalized greeting hook",
      "Build on previous email (progressive education)",
      "Email 5 includes soft call-to-action (e.g., Want to learn more?)",
      "Each email should stand alone (people dont always read all)",
      "Helpful, not salesy tone"
    ],
    "tone_modifier": "Conversational and helpful, not promotional"
  }'::jsonb
);

-- Twitter Thread Template
INSERT INTO content_templates (id, account_id, template_name, is_default, config)
VALUES (
  uuid_generate_v4(),
  NULL,
  'twitter_thread',
  true,
  '{
    "count": 1,
    "length": "8-12 tweets",
    "structure": "Hook tweet → Key points (1 per tweet) → Conclusion/CTA tweet",
    "requirements": [
      "First tweet: Scroll-stopping hook",
      "Each tweet: 200-280 characters",
      "One key idea per tweet",
      "Use line breaks for readability",
      "Last tweet: Summary + CTA or question",
      "Number tweets (1/12, 2/12, etc.)"
    ],
    "tone_modifier": "Punchy and concise, Twitter-appropriate"
  }'::jsonb
);

-- Executive Summary Template
INSERT INTO content_templates (id, account_id, template_name, is_default, config)
VALUES (
  uuid_generate_v4(),
  NULL,
  'executive_summary',
  true,
  '{
    "count": 1,
    "length": "250-400 words",
    "structure": "Overview → Key insights (3-5 bullet points) → Recommendations",
    "requirements": [
      "Suitable for forwarding to executives",
      "Lead with most important insight",
      "Quantify where possible (numbers, stats, percentages)",
      "3-5 key takeaways in bullet points",
      "Clear next steps or recommendations"
    ],
    "tone_modifier": "Business-focused, executive level"
  }'::jsonb
);

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify seed data was inserted correctly
-- ============================================================================

-- Count default templates (should be 5)
-- SELECT COUNT(*) FROM content_templates WHERE is_default = true;

-- List all default templates
-- SELECT template_name, config->>'length' as length, config->>'count' as count
-- FROM content_templates
-- WHERE is_default = true;