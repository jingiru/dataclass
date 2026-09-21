-- Run once in this app's Supabase SQL Editor before deploying the round-aware app.
-- Existing submissions and grades belong to round 1.
alter table public.submissions
  add column if not exists round smallint not null default 1;
alter table public.submissions
  add constraint submissions_round_check check (round between 1 and 5);

alter table public.grading_results
  add column if not exists round smallint not null default 1;
alter table public.grading_results
  add constraint grading_results_round_check check (round between 1 and 5);

alter table public.class_score_publications
  add column if not exists round smallint not null default 1;
alter table public.class_score_publications
  add constraint class_score_publications_round_check check (round between 1 and 5);
alter table public.class_score_publications
  drop constraint class_score_publications_pkey;
alter table public.class_score_publications
  add primary key (classroom, round);

create index if not exists submissions_round_classroom_submitted_idx
  on public.submissions (round, classroom, submitted_at desc);
create index if not exists grading_results_round_classroom_idx
  on public.grading_results (round, classroom);
