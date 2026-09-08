-- searchProfiles() does ilike('username', '%text%'); the leading wildcard means a plain
-- btree index (e.g. the one backing the "username unique" constraint) can never be used,
-- forcing a sequential scan on every keystroke. A trigram GIN index lets Postgres use an
-- index scan for substring matches instead. pg_trgm is a standard, Supabase-approved extension.
create extension if not exists pg_trgm;

create index profiles_username_trgm_idx on public.profiles using gin (username gin_trgm_ops);
