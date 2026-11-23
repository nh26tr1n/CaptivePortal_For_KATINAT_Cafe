-- Redeem one voucher atomically. The service-role-only function locks the voucher row
-- so concurrent requests cannot exceed max_uses or create duplicate redemptions.
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_code text, p_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  selected_voucher public.vouchers%ROWTYPE;
  redemption_id uuid;
  next_used_count integer;
BEGIN
  IF p_code IS NULL OR pg_catalog.btrim(p_code) = '' OR p_customer_id IS NULL THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  SELECT *
  INTO selected_voucher
  FROM public.vouchers AS voucher
  WHERE pg_catalog.upper(voucher.code) = pg_catalog.upper(pg_catalog.btrim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF selected_voucher.active IS FALSE THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'inactive');
  END IF;
  IF selected_voucher.expires_at IS NOT NULL AND selected_voucher.expires_at <= pg_catalog.now() THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'expired');
  END IF;
  IF selected_voucher.max_uses IS NOT NULL AND selected_voucher.used_count >= selected_voucher.max_uses THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'exhausted');
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = p_customer_id AND profile.role = 'customer'
  ) THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'customer_not_found');
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.voucher_redemptions AS redemption
    WHERE redemption.voucher_id = selected_voucher.id
      AND redemption.customer_id = p_customer_id
  ) THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  INSERT INTO public.voucher_redemptions (voucher_id, customer_id)
  VALUES (selected_voucher.id, p_customer_id)
  ON CONFLICT (voucher_id, customer_id) DO NOTHING
  RETURNING id INTO redemption_id;

  IF redemption_id IS NULL THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  UPDATE public.vouchers
  SET used_count = used_count + 1
  WHERE id = selected_voucher.id
  RETURNING used_count INTO next_used_count;

  RETURN pg_catalog.json_build_object(
    'ok', true,
    'redemption_id', redemption_id,
    'voucher_id', selected_voucher.id,
    'used_count', next_used_count
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN pg_catalog.json_build_object('ok', false, 'error', 'already_redeemed');
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_voucher(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(text, uuid) TO service_role;
