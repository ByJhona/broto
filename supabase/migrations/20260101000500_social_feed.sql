create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  caption text,
  level text default 'iniciante',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Users can insert their own posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update using (auth.uid() = user_id);

create policy "Post likes are viewable by everyone"
  on public.post_likes for select using (true);

create policy "Users can like posts"
  on public.post_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.post_likes for delete using (auth.uid() = user_id);

create policy "Post comments are viewable by everyone"
  on public.post_comments for select using (true);

create policy "Users can insert their own comments"
  on public.post_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.post_comments for delete using (auth.uid() = user_id);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger post_comments_set_updated_at
  before update on public.post_comments
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

create policy "Post images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'posts' );

create policy "Users can upload their own post images."
  on storage.objects for insert
  with check (
    bucket_id = 'posts' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own post images."
  on storage.objects for delete
  using (
    bucket_id = 'posts' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
