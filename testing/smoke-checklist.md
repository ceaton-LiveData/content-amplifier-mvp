# Smoke Test Checklist (MVP)

Goal: verify the core app path still works after each hardening step. Run after any change that touches auth, data access, or generation.

## Pre-flight
- [ ] Required env vars are set: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
- [ ] Dev server runs: `npm install` (first time) then `npm run dev`

## Core flow (10-15 min)
- [ ] Sign up or sign in works without errors
- [ ] Onboarding: generate brand voice from pasted examples and save profile
- [ ] Upload: paste a short transcript and continue
- [ ] Generate: select LinkedIn only, generate, and reach the library
- [ ] Library: open a piece, copy to clipboard, close modal
- [ ] Calendar: schedule one post for tomorrow; it appears on the calendar

## Expected results
- [ ] No console errors that include secrets or user data
- [ ] No blank screens or stuck loading states
- [ ] Data shown belongs only to the current user

Notes:
- If any step fails, stop and fix before proceeding to the next hardening task.
