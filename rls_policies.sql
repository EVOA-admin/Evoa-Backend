-- ============================================================
-- EVOA – Row Level Security Policies
-- Generated: 2026-03-20
-- Safe to re-run: all statements use DROP IF EXISTS + CREATE
-- ============================================================
-- NOTE: The NestJS backend uses the service_role key which
-- bypasses RLS entirely. All policies here protect against
-- direct anon/authenticated Supabase client access only.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- HELPER FUNCTION
-- Resolves current Supabase auth.uid() → app users.id
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users
  WHERE supabase_user_id = auth.uid()::text
  LIMIT 1;
$$;


-- ══════════════════════════════════════════════════════════
-- 1. users
-- ══════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: authenticated can read all" ON users;
CREATE POLICY "users: authenticated can read all"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "users: own row update" ON users;
CREATE POLICY "users: own row update"
  ON users FOR UPDATE
  USING (supabase_user_id = auth.uid()::text);


-- ══════════════════════════════════════════════════════════
-- 2. startups
-- ══════════════════════════════════════════════════════════
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "startups: public read" ON startups;
CREATE POLICY "startups: public read"
  ON startups FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "startups: founder update" ON startups;
CREATE POLICY "startups: founder update"
  ON startups FOR UPDATE
  USING (founder_id = get_my_user_id());

DROP POLICY IF EXISTS "startups: founder delete" ON startups;
CREATE POLICY "startups: founder delete"
  ON startups FOR DELETE
  USING (founder_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 3. investors
-- ══════════════════════════════════════════════════════════
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investors: public read" ON investors;
CREATE POLICY "investors: public read"
  ON investors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "investors: owner update" ON investors;
CREATE POLICY "investors: owner update"
  ON investors FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "investors: owner delete" ON investors;
CREATE POLICY "investors: owner delete"
  ON investors FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 4. incubators
-- ══════════════════════════════════════════════════════════
ALTER TABLE incubators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incubators: public read" ON incubators;
CREATE POLICY "incubators: public read"
  ON incubators FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "incubators: owner update" ON incubators;
CREATE POLICY "incubators: owner update"
  ON incubators FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "incubators: owner delete" ON incubators;
CREATE POLICY "incubators: owner delete"
  ON incubators FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 5. posts
-- ══════════════════════════════════════════════════════════
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts: public read" ON posts;
CREATE POLICY "posts: public read"
  ON posts FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "posts: owner update" ON posts;
CREATE POLICY "posts: owner update"
  ON posts FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "posts: owner delete" ON posts;
CREATE POLICY "posts: owner delete"
  ON posts FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 6. reels
-- ══════════════════════════════════════════════════════════
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reels: public read" ON reels;
CREATE POLICY "reels: public read"
  ON reels FOR SELECT
  USING (deleted_at IS NULL);

-- Reels are never directly mutated by clients (only via service_role)
-- No additional policies needed beyond service_role bypass


-- ══════════════════════════════════════════════════════════
-- 7. reel_likes
-- ══════════════════════════════════════════════════════════
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reel_likes: authenticated read" ON reel_likes;
CREATE POLICY "reel_likes: authenticated read"
  ON reel_likes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "reel_likes: own delete" ON reel_likes;
CREATE POLICY "reel_likes: own delete"
  ON reel_likes FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 8. reel_saves
-- ══════════════════════════════════════════════════════════
ALTER TABLE reel_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reel_saves: own read" ON reel_saves;
CREATE POLICY "reel_saves: own read"
  ON reel_saves FOR SELECT
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "reel_saves: own delete" ON reel_saves;
CREATE POLICY "reel_saves: own delete"
  ON reel_saves FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 9. reel_views  (analytics-only, fully protected)
-- ══════════════════════════════════════════════════════════
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reel_views: deny client access" ON reel_views;
CREATE POLICY "reel_views: deny client access"
  ON reel_views FOR ALL
  USING (false);


-- ══════════════════════════════════════════════════════════
-- 10. reel_comments
-- ══════════════════════════════════════════════════════════
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reel_comments: public read" ON reel_comments;
CREATE POLICY "reel_comments: public read"
  ON reel_comments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "reel_comments: own update" ON reel_comments;
CREATE POLICY "reel_comments: own update"
  ON reel_comments FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "reel_comments: own delete" ON reel_comments;
CREATE POLICY "reel_comments: own delete"
  ON reel_comments FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 11. reel_shares  (analytics-only)
-- ══════════════════════════════════════════════════════════
ALTER TABLE reel_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reel_shares: deny client access" ON reel_shares;
CREATE POLICY "reel_shares: deny client access"
  ON reel_shares FOR ALL
  USING (false);


-- ══════════════════════════════════════════════════════════
-- 12. post_likes  (analytics-only)
-- ══════════════════════════════════════════════════════════
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes: deny client access" ON post_likes;
CREATE POLICY "post_likes: deny client access"
  ON post_likes FOR ALL
  USING (false);


-- ══════════════════════════════════════════════════════════
-- 13. post_saves
-- ══════════════════════════════════════════════════════════
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_saves: own read" ON post_saves;
CREATE POLICY "post_saves: own read"
  ON post_saves FOR SELECT
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "post_saves: own delete" ON post_saves;
CREATE POLICY "post_saves: own delete"
  ON post_saves FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 14. post_comments
-- ══════════════════════════════════════════════════════════
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_comments: authenticated read" ON post_comments;
CREATE POLICY "post_comments: authenticated read"
  ON post_comments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "post_comments: own update" ON post_comments;
CREATE POLICY "post_comments: own update"
  ON post_comments FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "post_comments: own delete" ON post_comments;
CREATE POLICY "post_comments: own delete"
  ON post_comments FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 15. post_website_clicks  (analytics-only)
-- ══════════════════════════════════════════════════════════
ALTER TABLE post_website_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_website_clicks: deny client access" ON post_website_clicks;
CREATE POLICY "post_website_clicks: deny client access"
  ON post_website_clicks FOR ALL
  USING (false);


-- ══════════════════════════════════════════════════════════
-- 16. follows
-- ══════════════════════════════════════════════════════════
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows: public read" ON follows;
CREATE POLICY "follows: public read"
  ON follows FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "follows: own delete" ON follows;
CREATE POLICY "follows: own delete"
  ON follows FOR DELETE
  USING (follower_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 17. conversations
-- ══════════════════════════════════════════════════════════
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations: participant read" ON conversations;
CREATE POLICY "conversations: participant read"
  ON conversations FOR SELECT
  USING (
    user1_id = get_my_user_id()
    OR user2_id = get_my_user_id()
  );

DROP POLICY IF EXISTS "conversations: participant update" ON conversations;
CREATE POLICY "conversations: participant update"
  ON conversations FOR UPDATE
  USING (
    user1_id = get_my_user_id()
    OR user2_id = get_my_user_id()
  );


-- ══════════════════════════════════════════════════════════
-- 18. messages
-- ══════════════════════════════════════════════════════════
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages: conversation participant read" ON messages;
CREATE POLICY "messages: conversation participant read"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = get_my_user_id() OR c.user2_id = get_my_user_id())
    )
  );

DROP POLICY IF EXISTS "messages: sender update" ON messages;
CREATE POLICY "messages: sender update"
  ON messages FOR UPDATE
  USING (sender_id = get_my_user_id());

DROP POLICY IF EXISTS "messages: sender delete" ON messages;
CREATE POLICY "messages: sender delete"
  ON messages FOR DELETE
  USING (sender_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 19. message_requests
-- ══════════════════════════════════════════════════════════
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_requests: sender or receiver read" ON message_requests;
CREATE POLICY "message_requests: sender or receiver read"
  ON message_requests FOR SELECT
  USING (
    from_user_id = get_my_user_id()
    OR to_user_id = get_my_user_id()
  );

DROP POLICY IF EXISTS "message_requests: receiver update" ON message_requests;
CREATE POLICY "message_requests: receiver update"
  ON message_requests FOR UPDATE
  USING (to_user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 20. meetings
-- ══════════════════════════════════════════════════════════
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings: participant read" ON meetings;
CREATE POLICY "meetings: participant read"
  ON meetings FOR SELECT
  USING (
    investor_id = get_my_user_id()
    OR founder_id = get_my_user_id()
  );

DROP POLICY IF EXISTS "meetings: participant update" ON meetings;
CREATE POLICY "meetings: participant update"
  ON meetings FOR UPDATE
  USING (
    investor_id = get_my_user_id()
    OR founder_id = get_my_user_id()
  );


-- ══════════════════════════════════════════════════════════
-- 21. notifications
-- ══════════════════════════════════════════════════════════
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications: own read" ON notifications;
CREATE POLICY "notifications: own read"
  ON notifications FOR SELECT
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "notifications: own update" ON notifications;
CREATE POLICY "notifications: own update"
  ON notifications FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "notifications: own delete" ON notifications;
CREATE POLICY "notifications: own delete"
  ON notifications FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 22. stories
-- ══════════════════════════════════════════════════════════
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories: authenticated read non-expired" ON stories;
CREATE POLICY "stories: authenticated read non-expired"
  ON stories FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND expires_at > now()
  );

DROP POLICY IF EXISTS "stories: own update" ON stories;
CREATE POLICY "stories: own update"
  ON stories FOR UPDATE
  USING (user_id = get_my_user_id());

DROP POLICY IF EXISTS "stories: own delete" ON stories;
CREATE POLICY "stories: own delete"
  ON stories FOR DELETE
  USING (user_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 23. user_connections
-- ══════════════════════════════════════════════════════════
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_connections: participant read" ON user_connections;
CREATE POLICY "user_connections: participant read"
  ON user_connections FOR SELECT
  USING (
    connector_id = get_my_user_id()
    OR target_id = get_my_user_id()
  );

DROP POLICY IF EXISTS "user_connections: own delete" ON user_connections;
CREATE POLICY "user_connections: own delete"
  ON user_connections FOR DELETE
  USING (connector_id = get_my_user_id());


-- ══════════════════════════════════════════════════════════
-- 24. hashtags  (read-only lookup table)
-- ══════════════════════════════════════════════════════════
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hashtags: public read" ON hashtags;
CREATE POLICY "hashtags: public read"
  ON hashtags FOR SELECT
  USING (true);


-- ══════════════════════════════════════════════════════════
-- 25. investor_ai_logs  (private AI interaction logs)
-- ══════════════════════════════════════════════════════════
ALTER TABLE investor_ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor_ai_logs: own read" ON investor_ai_logs;
CREATE POLICY "investor_ai_logs: own read"
  ON investor_ai_logs FOR SELECT
  USING (investor_id = get_my_user_id());

DROP POLICY IF EXISTS "investor_ai_logs: own delete" ON investor_ai_logs;
CREATE POLICY "investor_ai_logs: own delete"
  ON investor_ai_logs FOR DELETE
  USING (investor_id = get_my_user_id());


-- ──────────────────────────────────────────────────────────
-- Done.
-- ──────────────────────────────────────────────────────────
