# Brevo transactional email setup

1. In Brevo, open **Settings → SMTP & API → API keys** and create an API key.
2. Add the key to `.env.local` as `BREVO_API_KEY`. Keep it server-side; do not prefix it with `NEXT_PUBLIC_`.
3. Open **Settings → Senders & IP → Senders**, add the address you intend to use, and complete Brevo's sender verification.
4. Put that verified address in `.env.local` as `BREVO_SENDER_EMAIL`.
5. Set `NEXT_PUBLIC_APP_URL` to the public application origin. Unsubscribe links are signed with `SUPABASE_SERVICE_ROLE_KEY`, which must also remain server-side.
6. Restart the application after changing environment variables. Use the campaign form's test-send action to verify delivery to the signed-in administrator.

Campaign recipients are processed sequentially with a 200 ms pause. Brevo API errors are stored on failed recipients, and a successful response's `messageId` is saved to `email_logs.provider_message_id`. Delivery, bounce, and complaint webhooks are not configured by this project.
