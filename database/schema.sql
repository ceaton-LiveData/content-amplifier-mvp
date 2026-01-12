-- Content Amplifier MVP Database Schema
-- PostgreSQL (Supabase)
-- Last Updated: 2025-01-11

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ACCOUNTS TABLE
-- One account per user, stores brand voice and preferences
-- ============================================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Brand voice configuration
  brand_voice_profile TEXT,
  brand_voice_source_type TEXT CHECK (brand_voice_source_type IN ('document', 'examples', 'manual')),
  brand_voice_source_file TEXT, -- Supabase storage URL if uploaded document
  target_audience TEXT,
  words_to_avoid TEXT,
  example_content JSONB, -- Stores pasted examples if used
  
  -- Usage tracking
  videos_processed_this_month INTEGER DEFAULT 0,
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'enterprise')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- ============================================================================
-- CONTENT SOURCES TABLE
-- Uploaded transcripts and their metadata
-- ============================================================================

CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Source information
  source_type TEXT DEFAULT 'transcript' CHECK (source_type IN ('transcript', 'video', 'audio')),
  original_filename TEXT NOT NULL,
  file_url TEXT, -- Supabase storage URL (temporary, deleted after text extraction)
  
  -- Extracted content
  transcript_text TEXT NOT NULL,
  
  -- Metadata
  title TEXT,
  notes TEXT,
  estimated_duration_min INTEGER,
  file_size_bytes BIGINT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_sources_account_id ON content_sources(account_id);
CREATE INDEX idx_content_sources_created_at ON content_sources(created_at DESC);

-- ============================================================================
-- CONTENT TEMPLATES TABLE
-- Defines how each content type should be generated
-- ============================================================================

CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Template identification
  template_name TEXT NOT NULL, -- 'linkedin_post', 'blog_post', 'email_sequence', etc.
  is_default BOOLEAN DEFAULT false, -- True for system templates
  
  -- Template configuration
  config JSONB NOT NULL,
  /* Example config structure:
  {
    "count": 5,
    "length": "150-200 words",
    "structure": "Hook → Insight → CTA",
    "requirements": [
      "Start with attention-grabbing hook",
      "Include specific data point",
      "End with question"
    ],
    "tone_modifier": "slightly casual"
  }
  */
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_templates_account_id ON content_templates(account_id);
CREATE INDEX idx_content_templates_name ON content_templates(template_name);

-- Unique constraint: one template name per account (for custom templates)
CREATE UNIQUE INDEX idx_unique_template_per_account 
  ON content_templates(account_id, template_name) 
  WHERE account_id IS NOT NULL;

-- ============================================================================
-- CONTENT GENERATIONS TABLE
-- Tracks each content generation job
-- ============================================================================

CREATE TABLE content_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_source_id UUID REFERENCES content_sources(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Generation settings
  selected_types JSONB NOT NULL, -- ["linkedin_post", "blog_post", "email_sequence"]
  tone_override TEXT CHECK (tone_override IN ('formal', 'casual', 'technical', NULL)),
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  error_message TEXT,
  
  -- Cost tracking
  total_cost NUMERIC(10, 4) DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  processing_time_seconds INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_content_generations_account_id ON content_generations(account_id);
CREATE INDEX idx_content_generations_source_id ON content_generations(content_source_id);
CREATE INDEX idx_content_generations_status ON content_generations(status);
CREATE INDEX idx_content_generations_created_at ON content_generations(created_at DESC);

-- ============================================================================
-- GENERATED CONTENT TABLE
-- Individual pieces of generated content
-- ============================================================================

CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id UUID REFERENCES content_generations(id) ON DELETE CASCADE NOT NULL,
  content_source_id UUID REFERENCES content_sources(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES content_templates(id),
  
  -- Content data
  content_type TEXT NOT NULL, -- 'linkedin_post', 'blog_post', 'email', etc.
  content_text TEXT NOT NULL,
  content_metadata JSONB, -- Type-specific metadata (e.g., email subject, tweet count)
  
  -- Generation tracking
  generation_cost NUMERIC(10, 4),
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  
  -- User interaction
  user_edited BOOLEAN DEFAULT false,
  user_edits TEXT, -- What the user changed (for learning)
  downloaded BOOLEAN DEFAULT false,
  viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generated_content_generation_id ON generated_content(generation_id);
CREATE INDEX idx_generated_content_account_id ON generated_content(account_id);
CREATE INDEX idx_generated_content_source_id ON generated_content(content_source_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_created_at ON generated_content(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only see/modify their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Accounts: Users can only access their own account
CREATE POLICY "Users can view own account" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own account" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content Sources: Users can only access their own sources
CREATE POLICY "Users can view own sources" ON content_sources
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own sources" ON content_sources
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own sources" ON content_sources
  FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own sources" ON content_sources
  FOR DELETE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- Content Templates: Users can view default templates + their own custom templates
CREATE POLICY "Users can view templates" ON content_templates
  FOR SELECT USING (
    is_default = true OR 
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own templates" ON content_templates
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own templates" ON content_templates
  FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own templates" ON content_templates
  FOR DELETE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- Content Generations: Users can only access their own generations
CREATE POLICY "Users can view own generations" ON content_generations
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own generations" ON content_generations
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own generations" ON content_generations
  FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- Generated Content: Users can only access their own content
CREATE POLICY "Users can view own content" ON generated_content
  FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own content" ON generated_content
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own content" ON generated_content
  FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own content" ON generated_content
  FOR DELETE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for accounts table
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for content_templates table
CREATE TRIGGER update_content_templates_updated_at
  BEFORE UPDATE ON content_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create account when user signs up
CREATE OR REPLACE FUNCTION create_account_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO accounts (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create account on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_account_for_new_user();

-- Function to reset monthly usage counter
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE accounts SET videos_processed_this_month = 0;
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this function to run on the 1st of each month via Supabase cron
-- or pg_cron extension

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get usage this month for an account
CREATE OR REPLACE FUNCTION get_usage_this_month(p_account_id UUID)
RETURNS INTEGER AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO usage_count
  FROM content_generations
  WHERE account_id = p_account_id
    AND status = 'complete'
    AND created_at >= DATE_TRUNC('month', NOW());
  
  RETURN usage_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can process more transcripts
CREATE OR REPLACE FUNCTION can_process_transcript(p_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  plan TEXT;
  limit_count INTEGER;
BEGIN
  -- Get current plan and usage
  SELECT plan_tier INTO plan FROM accounts WHERE id = p_account_id;
  current_usage := get_usage_this_month(p_account_id);
  
  -- Set limits based on plan
  CASE plan
    WHEN 'free' THEN limit_count := 10;
    WHEN 'starter' THEN limit_count := 20;
    WHEN 'pro' THEN limit_count := 50;
    WHEN 'enterprise' THEN limit_count := 999999; -- Essentially unlimited
    ELSE limit_count := 10;
  END CASE;
  
  RETURN current_usage < limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_generations_account_status 
  ON content_generations(account_id, status);

CREATE INDEX idx_content_account_type 
  ON generated_content(account_id, content_type);

-- Full-text search on transcript text (for future search feature)
CREATE INDEX idx_transcript_text_search 
  ON content_sources 
  USING gin(to_tsvector('english', transcript_text));

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE accounts IS 'User accounts with brand voice configuration and usage tracking';
COMMENT ON TABLE content_sources IS 'Uploaded transcripts and source content';
COMMENT ON TABLE content_templates IS 'System and custom templates for content generation';
COMMENT ON TABLE content_generations IS 'Individual content generation jobs';
COMMENT ON TABLE generated_content IS 'Individual pieces of generated content';

COMMENT ON COLUMN accounts.brand_voice_profile IS 'AI-generated description of brand writing style';
COMMENT ON COLUMN accounts.videos_processed_this_month IS 'Counter for usage limits, reset on 1st of month';
COMMENT ON COLUMN content_sources.transcript_text IS 'Extracted text from uploaded file';
COMMENT ON COLUMN content_generations.selected_types IS 'Array of content types to generate';
COMMENT ON COLUMN generated_content.content_metadata IS 'Type-specific data like email subjects';

-- ============================================================================
-- GRANTS (if needed for specific roles)
-- ============================================================================

-- Grant access to authenticated users (Supabase handles this automatically)
-- But included here for completeness

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;