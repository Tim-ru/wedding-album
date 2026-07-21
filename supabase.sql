create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id text not null default 'main',
  storage_path text not null unique,
  public_url text not null,
  guest_name text,
  original_name text not null,
  size_bytes bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

drop policy if exists "Public can read wedding photos" on public.photos;
create policy "Public can read wedding photos"
on public.photos
for select
to anon
using (true);

drop policy if exists "Public can add wedding photos" on public.photos;
create policy "Public can add wedding photos"
on public.photos
for insert
to anon
with check (
  album_id = 'main'
  and mime_type like 'image/%'
  and size_bytes <= 15728640
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-photos',
  'wedding-photos',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload wedding photos" on storage.objects;
create policy "Public can upload wedding photos"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'wedding-photos'
  and (storage.foldername(name))[1] = 'main'
);

drop policy if exists "Public can read wedding photo files" on storage.objects;
create policy "Public can read wedding photo files"
on storage.objects
for select
to anon
using (bucket_id = 'wedding-photos');

-- Needed for the static admin screen to remove photos. A public frontend cannot
-- keep destructive actions truly secret, so use a backend/Edge Function later if
-- you need stronger admin protection.
drop policy if exists "Public can delete wedding photo rows" on public.photos;
create policy "Public can delete wedding photo rows"
on public.photos
for delete
to anon
using (album_id = 'main');

drop policy if exists "Public can delete wedding photo files" on storage.objects;
create policy "Public can delete wedding photo files"
on storage.objects
for delete
to anon
using (bucket_id = 'wedding-photos' and (storage.foldername(name))[1] = 'main');
