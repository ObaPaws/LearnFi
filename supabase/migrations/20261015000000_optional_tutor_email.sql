create or replace function public.enforce_tutor_identity()
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
      and btrim(x_user_id) <> ''
      and wallet_address is not null
      and wallet_verified_at is not null
  ) then
    raise exception 'Tutor registration requires a linked X identity and a verified Solana wallet.';
  end if;
  return new;
end;
$$;
