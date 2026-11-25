# Supabase Auth setup

This guide configures Google OAuth, Facebook Login, and email OTP for local development and Vercel. The Supabase service role key and provider secrets stay in server-side settings and must never be added to browser code.

## 1. Find the Supabase callback URL

In the Supabase project, open **Project Settings → API** and copy the Project URL. The provider callback URI is:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Use the exact callback URI shown by the Supabase Auth provider settings if the project uses a custom domain.

## 2. Configure Google OAuth

1. In Google Cloud Console, create or select a project and configure the OAuth consent screen.
2. Create an OAuth Client ID with application type **Web application**.
3. Add `http://localhost:3000` and the production Vercel origin (for example, `https://<project>.vercel.app`) to **Authorized JavaScript origins**.
4. Add the Supabase callback URL from step 1 to **Authorized redirect URIs**. Google redirects to Supabase; the application callback is registered separately in Supabase below.
5. Copy the Google Client ID and Client Secret into Supabase. Do not put the secret in `.env.local` or the client bundle.

## 3. Configure Facebook Login

1. In Facebook Developers, create an app and add the **Facebook Login** product.
2. Configure the app domains and site URL for localhost and the production Vercel domain as allowed by the Facebook app settings.
3. In Facebook Login's valid OAuth redirect URI list, add the Supabase callback URL from step 1.
4. Copy the Facebook App ID and App Secret into Supabase. The app requests the `email` scope.

## 4. Enable providers in Supabase

1. Open **Authentication → Providers** in Supabase.
2. Enable **Google** and paste the Google Client ID and Client Secret.
3. Enable **Facebook** and paste the Facebook App ID and App Secret.
4. Enable **Email** and configure the email OTP/magic-link template and sender settings for the project.
5. In the email template used for sign-in, include `{{ .Token }}` in the message body so customers receive a code they can enter in the portal. The portal verifies this six-digit code with `verifyOtp`; a template that only renders `{{ .ConfirmationURL }}` provides a clickable link instead of the code-entry flow.
6. Save the provider configuration.

## 5. Configure callback allowlists

1. Open **Authentication → URL Configuration**.
2. Set the Site URL to the primary production URL when deploying, or `http://localhost:3000` for local-only development.
3. Add these application redirect URLs to the allowed redirect URL list:

   ```text
   http://localhost:3000/api/auth/callback
   https://<project>.vercel.app/api/auth/callback
   ```

4. For preview deployments, add the exact preview callback URLs you intend to use, or configure an appropriate narrowly scoped wildcard if supported by the project settings.
5. Set `NEXT_PUBLIC_APP_URL` to `http://localhost:3000` locally and to the production origin in Vercel's environment variables. The application redirects to `${NEXT_PUBLIC_APP_URL}/api/auth/callback`.

## 6. Verify the profile trigger

Apply `supabase/migrations/001_init.sql` before testing signup. Its `auth.users` trigger creates the corresponding `public.profiles` row. Sign in with each provider, then verify the current user's profile from a trusted SQL Editor session:

```sql
SELECT id, email, full_name, role, created_at
FROM public.profiles
WHERE email = '<test-account-email>';
```

The user should return to `/portal` and see the email returned by Supabase Auth. Users whose trusted JWT has `app_metadata.role = 'admin'` return to `/admin`.
