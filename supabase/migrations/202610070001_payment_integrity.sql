BEGIN;

-- Clients can edit personal information, never entitlements or usage counters.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.profiles FROM PUBLIC, anon, authenticated', c, c);
  END LOOP;
END $$;
GRANT INSERT (id, email, full_name, profession, country) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, profession, country) ON public.profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pending_approvals FROM PUBLIC, anon, authenticated;
DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pending_approvals'
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.pending_approvals FROM PUBLIC, anon, authenticated', c, c);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.increment_questions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_questions(uuid), public.check_rate_limit(uuid, integer) TO service_role;
ALTER FUNCTION public.increment_questions(uuid) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(uuid, integer) SET search_path = public;

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  provider text NOT NULL CHECK (provider IN ('instapay', 'gumroad')),
  external_id text NOT NULL,
  approval_id uuid REFERENCES public.pending_approvals(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product text,
  state text NOT NULL CHECK (state IN ('pending', 'applied', 'rejected', 'refunded', 'needs_review')),
  previous_tier public.user_tier,
  previous_expires_at timestamptz,
  applied_tier public.user_tier,
  applied_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_id)
);
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_receipts TO service_role;

-- Preserve all historical approvals, including duplicate approved/rejected rows.
INSERT INTO public.payment_receipts (provider, external_id, approval_id, user_id, state)
SELECT DISTINCT ON (lower(btrim(a.transaction_id)))
  'instapay', lower(btrim(a.transaction_id)), a.id, a.user_id,
  CASE a.status::text WHEN 'approved' THEN 'applied' WHEN 'rejected' THEN 'rejected' ELSE 'pending' END
FROM public.pending_approvals a JOIN public.profiles p ON p.id = a.user_id
WHERE a.payment_method = 'instapay' AND nullif(btrim(a.transaction_id), '') IS NOT NULL
ORDER BY lower(btrim(a.transaction_id)), (a.status::text = 'approved') DESC, a.created_at, a.id
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.reserve_instapay_receipt() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.payment_method = 'instapay' THEN
    NEW.transaction_id := lower(btrim(NEW.transaction_id));
    IF NEW.transaction_id IS NULL OR length(NEW.transaction_id) NOT BETWEEN 1 AND 50
      OR NEW.amount IS NULL OR NEW.amount NOT IN (300, 600)
      OR NEW.currency IS DISTINCT FROM 'EGP' OR NEW.status::text IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'INVALID_PAYMENT' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.payment_receipts (provider, external_id, approval_id, user_id, state)
    VALUES ('instapay', NEW.transaction_id, NEW.id, NEW.user_id, 'pending');
  END IF;
  RETURN NEW;
END $$;
-- AFTER INSERT lets the receipt's approval FK see the inserted row.
DROP TRIGGER IF EXISTS reserve_instapay_receipt ON public.pending_approvals;
CREATE TRIGGER reserve_instapay_receipt AFTER INSERT ON public.pending_approvals
FOR EACH ROW EXECUTE FUNCTION public.reserve_instapay_receipt();

CREATE OR REPLACE FUNCTION public.process_instapay_payment(p_approval_id uuid, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE a public.pending_approvals; p public.profiles; r public.payment_receipts;
  target public.user_tier; expiry timestamptz;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO a FROM public.pending_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'APPROVAL_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF a.status::text = (CASE p_action WHEN 'approve' THEN 'approved' ELSE 'rejected' END) THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;
  IF a.status::text IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'PAYMENT_ALREADY_PROCESSED'; END IF;
  SELECT * INTO r FROM public.payment_receipts
    WHERE provider = 'instapay' AND external_id = lower(btrim(a.transaction_id)) FOR UPDATE;
  IF NOT FOUND OR r.approval_id IS DISTINCT FROM a.id OR r.state <> 'pending' THEN
    RAISE EXCEPTION 'DUPLICATE_PAYMENT';
  END IF;
  IF p_action = 'reject' THEN
    UPDATE public.pending_approvals SET status = 'rejected' WHERE id = a.id;
    UPDATE public.payment_receipts SET state = 'rejected', updated_at = now()
      WHERE provider = 'instapay' AND external_id = r.external_id;
    RETURN jsonb_build_object('success', true, 'message', 'Rejected');
  END IF;
  IF a.payment_method IS DISTINCT FROM 'instapay' OR a.amount IS NULL OR a.amount NOT IN (300, 600)
    OR a.currency IS DISTINCT FROM 'EGP' THEN RAISE EXCEPTION 'INVALID_PAYMENT'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = a.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  target := CASE WHEN a.amount = 600 THEN 'ultra'::public.user_tier ELSE 'pro'::public.user_tier END;
  IF p.tier = 'ultra' AND target = 'pro' AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now()) THEN
    RAISE EXCEPTION 'ACTIVE_HIGHER_TIER';
  END IF;
  -- Review purchases against permanent grants instead of charging for unchanged access.
  IF p.tier <> 'free' AND p.subscription_expires_at IS NULL THEN
    RAISE EXCEPTION 'PERMANENT_GRANT_REQUIRES_REVIEW';
  ELSE
    expiry := greatest(now(), p.subscription_expires_at) + make_interval(months => CASE WHEN target = 'ultra' THEN 3 ELSE 1 END);
    UPDATE public.profiles SET tier = target, subscription_expires_at = expiry WHERE id = p.id;
  END IF;
  UPDATE public.payment_receipts SET state = 'applied', previous_tier = p.tier,
    previous_expires_at = p.subscription_expires_at, applied_tier = target,
    applied_expires_at = expiry, updated_at = now()
    WHERE provider = 'instapay' AND external_id = r.external_id;
  UPDATE public.pending_approvals SET status = 'approved' WHERE id = a.id;
  RETURN jsonb_build_object('success', true, 'tier', target);
END $$;

CREATE OR REPLACE FUNCTION public.process_gumroad_payment(p_sale_id text, p_email text, p_product text, p_refunded boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE p public.profiles; r public.payment_receipts; target public.user_tier; expiry timestamptz;
BEGIN
  IF p_product IS NULL OR p_product NOT IN ('hkfdfv', 'molojy') THEN
    RETURN jsonb_build_object('success', true, 'ignored', true);
  END IF;
  IF nullif(btrim(p_sale_id), '') IS NULL OR length(p_sale_id) > 200
    OR nullif(btrim(p_email), '') IS NULL OR p_refunded IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYMENT' USING ERRCODE = '22023';
  END IF;
  -- Serialize receipts before profiles to keep the same lock order as Instapay.
  PERFORM pg_advisory_xact_lock(hashtextextended('gumroad:' || p_sale_id, 0));
  SELECT * INTO r FROM public.payment_receipts WHERE provider = 'gumroad' AND external_id = p_sale_id FOR UPDATE;
  IF FOUND THEN
    IF r.product IS DISTINCT FROM p_product THEN RAISE EXCEPTION 'SALE_PRODUCT_MISMATCH'; END IF;
    SELECT * INTO p FROM public.profiles WHERE id = r.user_id FOR UPDATE;
    IF lower(p.email) IS DISTINCT FROM lower(btrim(p_email)) THEN RAISE EXCEPTION 'SALE_USER_MISMATCH'; END IF;
    IF r.state IN ('refunded', 'needs_review') OR (r.state = 'applied' AND NOT p_refunded) THEN
      RETURN jsonb_build_object('success', true, 'already_processed', true, 'state', r.state);
    END IF;
  ELSE
    -- Exact matching: email '%' and '_' never act as SQL wildcards.
    SELECT * INTO STRICT p FROM public.profiles WHERE lower(email) = lower(btrim(p_email)) FOR UPDATE;
    INSERT INTO public.payment_receipts (provider, external_id, user_id, product, state)
    VALUES ('gumroad', p_sale_id, p.id, p_product, 'pending') RETURNING * INTO r;
  END IF;
  IF p_refunded THEN
    IF r.state = 'applied' AND r.applied_expires_at IS NOT NULL THEN
      IF p.tier = r.applied_tier AND p.subscription_expires_at IS NOT DISTINCT FROM r.applied_expires_at THEN
        UPDATE public.profiles SET tier = r.previous_tier, subscription_expires_at = r.previous_expires_at WHERE id = p.id;
      ELSE
        -- A later purchase must not be revoked by refunding an older sale.
        UPDATE public.payment_receipts SET state = 'needs_review', updated_at = now()
          WHERE provider = 'gumroad' AND external_id = p_sale_id;
        RETURN jsonb_build_object('success', true, 'state', 'needs_review');
      END IF;
    END IF;
    UPDATE public.payment_receipts SET state = 'refunded', updated_at = now()
      WHERE provider = 'gumroad' AND external_id = p_sale_id;
    RETURN jsonb_build_object('success', true, 'state', 'refunded');
  END IF;
  target := CASE p_product WHEN 'hkfdfv' THEN 'pro'::public.user_tier ELSE 'ultra'::public.user_tier END;
  IF p.tier = 'ultra' AND target = 'pro' AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now()) THEN
    UPDATE public.payment_receipts SET state = 'needs_review', updated_at = now()
      WHERE provider = 'gumroad' AND external_id = p_sale_id;
    RETURN jsonb_build_object('success', true, 'state', 'needs_review');
  END IF;
  IF p.tier <> 'free' AND p.subscription_expires_at IS NULL THEN
    UPDATE public.payment_receipts SET state = 'needs_review', updated_at = now()
      WHERE provider = 'gumroad' AND external_id = p_sale_id;
    RETURN jsonb_build_object('success', true, 'state', 'needs_review');
  ELSE
    expiry := greatest(now(), p.subscription_expires_at) + make_interval(months => CASE WHEN target = 'ultra' THEN 3 ELSE 1 END);
    UPDATE public.profiles SET tier = target, subscription_expires_at = expiry WHERE id = p.id;
  END IF;
  UPDATE public.payment_receipts SET state = 'applied', previous_tier = p.tier,
    previous_expires_at = p.subscription_expires_at, applied_tier = target,
    applied_expires_at = expiry, updated_at = now()
    WHERE provider = 'gumroad' AND external_id = p_sale_id;
  RETURN jsonb_build_object('success', true, 'tier', target);
END $$;

REVOKE ALL ON FUNCTION public.reserve_instapay_receipt(), public.process_instapay_payment(uuid, text),
  public.process_gumroad_payment(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_instapay_receipt(), public.process_instapay_payment(uuid, text),
  public.process_gumroad_payment(text, text, text, boolean) TO service_role;
COMMIT;
