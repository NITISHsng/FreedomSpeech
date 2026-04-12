-- ==========================================
-- FINAL MASTER SCHEMA: FREEDOM SPEECH v2.5
-- ==========================================
-- Updated with Emoji Reactions (WhatsApp Style)
-- ==========================================

-- 0. Profiles: Persistent Anonymous Identities
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, 
  username TEXT,
  password TEXT,
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Groups: Communities / Booths
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Posts: Thoughts & Broadcasts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL, 
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Comments: Ghost Conversations
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Reactions: WhatsApp Style Emoji Feedback
-- Replaces old 'votes' table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  emoji TEXT NOT NULL, -- WhatsApp style (👍, ❤️, 😂, 😮, 😢, 🔥)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- WhatsApp style: One reaction per user per post
);

-- 5. History: Instant Activity Feed
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, 
  action_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PERFORMANCE INDEXES 
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);

-- ==========================================
-- REALTIME ENGINE CONFIGURATION
-- ==========================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  groups, profiles, posts, comments, reactions, history; 

-- ==========================================
-- SECURITY (RLS)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Polices: Public Read Access
CREATE POLICY "Allow public read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON posts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON comments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON reactions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON history FOR SELECT USING (true);

-- Polices: Anonymous Write Access
CREATE POLICY "Allow anonymous register" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow self update" ON profiles FOR UPDATE USING (id = (id)) WITH CHECK (id = (id));
CREATE POLICY "Allow anonymous insert" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update/delete" ON reactions FOR ALL USING (user_id = (user_id));
CREATE POLICY "Allow anonymous update" ON posts FOR UPDATE USING (user_id = user_id);
CREATE POLICY "Allow anonymous insert" ON history FOR INSERT WITH CHECK (true);

-- Seed Data
INSERT INTO groups (name, slug, description) VALUES 
('Global Square', 'global', 'The main square for everyone to speak freely.'),
('Tech Talk', 'tech', 'Discuss the latest in technology and innovation.'),
('Politics', 'politics', 'Unfiltered political discussions from around the world.')
ON CONFLICT (name) DO NOTHING;
