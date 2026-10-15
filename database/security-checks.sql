-- Run AFTER migration as an admin. All assertions should pass.
do $$
declare t text;
begin
  foreach t in array array['tb_accounts','tb_ledger','tb_consumed_loot','tb_active_voyages','tb_pvp_claims'] loop
    assert (select relrowsecurity from pg_class where oid=('public.'||t)::regclass),'RLS missing';
    assert not has_table_privilege('authenticated','public.'||t,'UPDATE'),'Browser can update private data';
    assert not has_table_privilege('authenticated','public.'||t,'INSERT'),'Browser can insert private data';
    assert not has_table_privilege('anon','public.'||t,'SELECT'),'Anonymous access exists';
  end loop;
  assert not has_function_privilege('authenticated','public.tb_commit_account(uuid,bigint,jsonb,text,jsonb,uuid[],uuid)','EXECUTE'),'Browser can grant rewards';
end $$;
