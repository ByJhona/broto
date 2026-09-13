alter table public.posts add column image_urls text[] not null default '{}';
update public.posts set image_urls = array[image_url] where image_url is not null;
alter table public.posts add constraint posts_image_urls_max_check check (cardinality(image_urls) <= 5);
alter table public.posts drop column image_url;
