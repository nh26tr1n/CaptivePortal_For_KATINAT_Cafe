-- Campaigns can reference one voucher so {{voucher_code}} is resolved at send time.
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS voucher_id uuid REFERENCES public.vouchers (id) ON DELETE SET NULL;
