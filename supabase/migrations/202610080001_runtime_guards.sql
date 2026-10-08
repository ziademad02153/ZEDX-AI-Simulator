BEGIN;

CREATE TABLE public.ai_usage_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    released boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_usage_reservations TO service_role;

CREATE FUNCTION public.reserve_ai_question(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; reservation uuid;
BEGIN
    SELECT * INTO p FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
    IF p.tier <> 'free' AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now()) THEN
        RETURN jsonb_build_object('allowed', true, 'reservation_id', NULL);
    END IF;
    IF coalesce(p.questions_asked, 0) >= 16 OR (
        SELECT count(*) FROM public.interviews WHERE user_id = p_user_id AND created_at >= date_trunc('month', now())
    ) >= 4 THEN
        RETURN jsonb_build_object('allowed', false);
    END IF;
    UPDATE public.profiles SET questions_asked = coalesce(questions_asked, 0) + 1 WHERE id = p_user_id;
    INSERT INTO public.ai_usage_reservations(user_id) VALUES(p_user_id) RETURNING id INTO reservation;
    RETURN jsonb_build_object('allowed', true, 'reservation_id', reservation);
END $$;

CREATE FUNCTION public.release_ai_question(p_reservation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation public.ai_usage_reservations%ROWTYPE;
BEGIN
    SELECT * INTO reservation FROM public.ai_usage_reservations WHERE id = p_reservation_id FOR UPDATE;
    IF NOT FOUND OR reservation.released THEN RETURN; END IF;
    UPDATE public.profiles SET questions_asked = greatest(0, coalesce(questions_asked, 0) - 1) WHERE id = reservation.user_id;
    UPDATE public.ai_usage_reservations SET released = true WHERE id = p_reservation_id;
END $$;

CREATE TABLE public.contact_rate_limits (
    key text PRIMARY KEY,
    window_start timestamptz NOT NULL,
    request_count integer NOT NULL
);
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.contact_rate_limits TO service_role;

CREATE FUNCTION public.consume_contact_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used integer;
BEGIN
    IF p_limit < 1 OR p_window_seconds < 1 THEN RAISE EXCEPTION 'INVALID_LIMIT'; END IF;
    INSERT INTO public.contact_rate_limits(key, window_start, request_count) VALUES(p_key, now(), 1)
    ON CONFLICT(key) DO UPDATE SET
        request_count = CASE WHEN contact_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
            THEN 1 ELSE contact_rate_limits.request_count + 1 END,
        window_start = CASE WHEN contact_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
            THEN now() ELSE contact_rate_limits.window_start END
    RETURNING request_count INTO used;
    RETURN used <= p_limit;
END $$;

REVOKE ALL ON FUNCTION public.reserve_ai_question(uuid), public.release_ai_question(uuid), public.consume_contact_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_question(uuid), public.release_ai_question(uuid), public.consume_contact_limit(text, integer, integer) TO service_role;
COMMIT;
