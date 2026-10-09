alter table public.users
  add column verified_email text,
  add column email_verified_at timestamptz;

update public.users as profile
set verified_email = auth_user.email,
    email_verified_at = auth_user.email_confirmed_at
from auth.users as auth_user
where profile.auth_user_id = auth_user.id
  and auth_user.email_confirmed_at is not null;

update public.tutor_profiles as tutor
set is_published = false
from public.users as profile
where tutor.user_id = profile.id
  and (
    profile.x_user_id is null
    or profile.wallet_address is null
    or profile.wallet_verified_at is null
    or profile.verified_email is null
    or profile.email_verified_at is null
  );

delete from public.user_roles as role
using public.users as profile
where role.user_id = profile.id
  and role.role = 'tutor'
  and (
    profile.x_user_id is null
    or profile.wallet_address is null
    or profile.wallet_verified_at is null
    or profile.verified_email is null
    or profile.email_verified_at is null
  );

create table public.auth_profile_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index auth_profile_links_profile_id_idx on public.auth_profile_links(profile_id);

insert into public.auth_profile_links (auth_user_id, profile_id)
select auth_user_id, id from public.users
on conflict (auth_user_id) do nothing;

alter table public.auth_profile_links enable row level security;
revoke all on public.auth_profile_links from anon, authenticated;
grant all on public.auth_profile_links to service_role;

create function public.enforce_tutor_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = new.user_id
      and x_user_id is not null
      and wallet_address is not null
      and wallet_verified_at is not null
      and verified_email is not null
      and email_verified_at is not null
  ) then
    raise exception 'Tutor registration requires a verified X identity, Solana wallet, and email.';
  end if;
  return new;
end;
$$;

create trigger tutor_profile_identity_required
before insert or update on public.tutor_profiles
for each row execute function public.enforce_tutor_identity();

create trigger tutor_role_identity_required
before insert or update on public.user_roles
for each row when (new.role = 'tutor')
execute function public.enforce_tutor_identity();