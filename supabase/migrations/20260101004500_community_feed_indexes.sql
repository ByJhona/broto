-- Feed pagination filters "deleted_at is null" and orders by "created_at desc";
-- a partial index matching that predicate avoids a full table scan + sort per page.
create index posts_feed_idx on public.posts (created_at desc) where deleted_at is null;

-- Used by RLS (auth.uid() = user_id) and by the "seguindo" scope's .in('user_id', ...) filter.
create index posts_user_id_idx on public.posts (user_id);

-- Used by the nested post_comments embed in the feed query and by RLS.
create index post_comments_post_id_idx on public.post_comments (post_id) where deleted_at is null;

-- follows' primary key is (follower_id, following_id), which only covers lookups by
-- follower_id. getFollowCounts() also filters by following_id (follower count on every
-- profile view) with no index to back it — add the missing side.
create index follows_following_id_idx on public.follows (following_id);
