-- Run once in the Supabase SQL Editor for your project.
create table if not exists public.bug_hunt_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 16 and name = btrim(name)),
  score integer not null check (score between 0 and 1000000),
  mode text not null check (mode in ('classic', 'sprint')),
  created_at timestamptz not null default now()
);

create index if not exists bug_hunt_scores_ranking
  on public.bug_hunt_scores (mode, score desc, created_at asc);

alter table public.bug_hunt_scores enable row level security;

-- The anonymous browser client needs only SELECT and INSERT, never UPDATE/DELETE.
revoke all on table public.bug_hunt_scores from anon, authenticated;
grant select (name, score, mode, created_at) on public.bug_hunt_scores to anon;
grant insert (name, score, mode) on public.bug_hunt_scores to anon;

drop policy if exists "Anyone can read Bug Hunt scores" on public.bug_hunt_scores;
create policy "Anyone can read Bug Hunt scores"
  on public.bug_hunt_scores for select to anon using (true);

drop policy if exists "Anyone can submit a Bug Hunt score" on public.bug_hunt_scores;
create policy "Anyone can submit a Bug Hunt score"
  on public.bug_hunt_scores for insert to anon
  with check (char_length(name) between 1 and 16 and name = btrim(name)
              and score between 0 and 1000000 and mode in ('classic', 'sprint'));