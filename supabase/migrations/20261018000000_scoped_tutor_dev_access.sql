-- Keep the development tutor bypass scoped to the one explicitly approved
-- Supabase Auth user. This permits tutor setup without a wallet while retaining
-- the X identity and verified email requirements.
create table public.tutor_dev_access (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.tutor_dev_access enable row level security;
revoke all on public.tutor_dev_access from public, anon, authenticated;
grant all on public.tutor_dev_access to service_role;

insert into public.tutor_dev_access (auth_user_id)
values ('63fbc263-dfc8-4fd2-8a18-d6a1fb9601fe')
on conflict (auth_user_id) do nothing;

create or replace function public.enforce_tutor_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tutor_user public.users%rowtype;
begin
  select * into tutor_user
  from public.users
  where id = new.user_id;

  if not found then
    raise exception 'Tutor registration requires an existing LearnFi profile.';
  end if;

  if tutor_user.x_user_id is not null
    and tutor_user.wallet_address is not null
    and tutor_user.wallet_verified_at is not null
    and tutor_user.verified_email is not null
    and tutor_user.email_verified_at is not null then
    return new;
  end if;

  if tutor_user.x_user_id is not null
    and tutor_user.verified_email is not null
    and tutor_user.email_verified_at is not null
    and exists (
      select 1
      from public.tutor_dev_access as dev_access
      where dev_access.auth_user_id = tutor_user.auth_user_id
    ) then
    return new;
  end if;

  raise exception 'Tutor registration requires a verified X identity, Solana wallet, and email.';
end;
$$;
