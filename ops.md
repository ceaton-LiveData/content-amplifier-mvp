# Ops Runbook (MVP)

Short operational checklist for Content Amplifier.

## Deploy Prereqs
- Vercel env vars set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
- Supabase SQL migrations applied:
  - `database/migrations/005_admin_hardening.sql`
  - `database/migrations/006_admin_redact_email.sql`
- Admin user seeded in `admin_users`:
  - `insert into admin_users (user_id) select id from auth.users where email = 'you@example.com';`

## Release Gate
- `npm run lint`
- `npm run build`
- Run short smoke checklist in `testing/smoke-checklist.md`

## Monitoring & Logs
- Check Supabase logs for auth and API errors
- Review `api_usage_logs` for error spikes

## Backups & Recovery
- Plan: enable Supabase PITR when ready
- Recovery drill: document restore steps once PITR enabled

## Key Rotation
- Rotate `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` quarterly (or after any incident)

## Incident Checklist (Quick)
- Confirm deploy health (Vercel logs)
- Validate Supabase status and auth
- Roll back if needed (redeploy last known good commit)
