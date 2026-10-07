-- Read-only production verification. Contains no personal information.
SELECT 'Paid fields protected' AS check_name,
  NOT has_column_privilege('authenticated','public.profiles','tier','UPDATE')
  AND NOT has_column_privilege('authenticated','public.profiles','subscription_expires_at','UPDATE')
  AND NOT has_column_privilege('authenticated','public.profiles','questions_asked','UPDATE')
  AND NOT has_column_privilege('authenticated','public.profiles','tier','INSERT') AS passed
UNION ALL SELECT 'Personal information editable',
  has_column_privilege('authenticated','public.profiles','full_name','UPDATE')
  AND has_column_privilege('authenticated','public.profiles','profession','UPDATE')
  AND has_column_privilege('authenticated','public.profiles','country','UPDATE')
UNION ALL SELECT 'Payment RPC server only',
  NOT has_function_privilege('anon','public.process_instapay_payment(uuid,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.process_gumroad_payment(text,text,text,boolean)','EXECUTE')
UNION ALL SELECT 'Quota RPC server only',
  NOT has_function_privilege('authenticated','public.increment_questions(uuid)','EXECUTE')
  AND NOT has_function_privilege('anon','public.check_rate_limit(uuid,integer)','EXECUTE')
UNION ALL SELECT 'Receipt RLS enabled',
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.payment_receipts'::regclass)
UNION ALL SELECT 'No client receipt access',
  NOT has_table_privilege('authenticated','public.payment_receipts','SELECT')
  AND NOT has_table_privilege('anon','public.payment_receipts','SELECT')
UNION ALL SELECT 'Duplicate protection enabled',
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='reserve_instapay_receipt' AND tgenabled='O')
UNION ALL SELECT 'Permanent Instapay purchase reviewed',
  position('PERMANENT_GRANT_REQUIRES_REVIEW' in pg_get_functiondef('public.process_instapay_payment(uuid,text)'::regprocedure))>0
UNION ALL SELECT 'Permanent Gumroad purchase reviewed',
  position('target:=p.tier;expiry:=NULL;' in pg_get_functiondef('public.process_gumroad_payment(text,text,text,boolean)'::regprocedure))=0;
