# Test Scenarios for Content Amplifier MVP

**Purpose:** Comprehensive testing before launch  
**Run these manually** (automated tests post-MVP)

---

## Scenario 1: New User Complete Flow

**Goal:** Verify entire happy path works

### Steps:
1. **Sign Up**
   - [ ] Go to signup page
   - [ ] Enter email: test@example.com
   - [ ] Enter password: TestPass123!
   - [ ] Click "Create Account"
   - [ ] Redirected to onboarding

2. **Onboarding - Brand Voice**
   - [ ] See "Set up your brand voice" screen
   - [ ] Choose "Upload document"
   - [ ] Upload test brand guide (PDF)
   - [ ] See "Analyzing..." message
   - [ ] Brand voice profile displays (reads correctly)
   - [ ] Click "Looks Good"
   - [ ] Redirected to dashboard

3. **Upload Transcript**
   - [ ] See empty dashboard with "Upload" button
   - [ ] Usage shows "0/10 transcripts this month"
   - [ ] Click "Upload Transcript"
   - [ ] Drop .txt transcript file
   - [ ] File uploads successfully
   - [ ] Optional title field works
   - [ ] Click "Next" or "Continue"

4. **Select Content Types**
   - [ ] See checkboxes for content types
   - [ ] LinkedIn, Blog, Email pre-checked
   - [ ] Can select/deselect types
   - [ ] Tone selector shows (default selected)
   - [ ] Can change tone
   - [ ] Click "Generate Content"

5. **Processing**
   - [ ] See processing screen
   - [ ] Status updates appear (Generating LinkedIn... etc.)
   - [ ] Estimated time shows
   - [ ] Completes in <5 minutes

6. **View Content**
   - [ ] Redirected to content library
   - [ ] All selected types shown
   - [ ] Click LinkedIn post card
   - [ ] Modal opens with full content
   - [ ] Content looks good (matches brand voice)
   - [ ] Click "Copy to Clipboard"
   - [ ] See "Copied!" confirmation
   - [ ] Close modal

7. **Download Content**
   - [ ] Click blog post card
   - [ ] Click "Download as .md"
   - [ ] File downloads
   - [ ] Open file - content correct

8. **Return to Dashboard**
   - [ ] Click back/home
   - [ ] See processed transcript in list
   - [ ] Usage now shows "1/10"
   - [ ] Can access content again

### Expected Results:
- ✅ All steps complete without errors
- ✅ Content matches brand voice
- ✅ Processing time <5 minutes
- ✅ All content accessible and downloadable

### Actual Results:
[Fill in during testing]

---

## Scenario 2: Brand Voice - Paste Examples

**Goal:** Verify alternative onboarding path works

### Steps:
1. **Sign up new user**
2. **On onboarding:**
   - [ ] Choose "Paste examples" instead of upload
   - [ ] Paste 3 text examples
   - [ ] Enter target audience
   - [ ] Enter words to avoid
   - [ ] Click "Analyze"
   - [ ] Brand voice profile generates
   - [ ] Profile makes sense
   - [ ] Can edit profile manually
   - [ ] Save works

### Expected Results:
- ✅ Analysis works with pasted text
- ✅ Can edit and save profile

---

## Scenario 3: Multiple File Formats

**Goal:** Test all supported transcript formats

### Steps:
For each file type (.txt, .docx, .vtt, .srt, .pdf):
1. **Upload file**
   - [ ] Upload successful
   - [ ] Text extracted correctly
   - [ ] Special characters handled (quotes, line breaks)
   - [ ] Can proceed to generation

### File Format Results:
- .txt: [ ] Pass / [ ] Fail
- .docx: [ ] Pass / [ ] Fail
- .vtt: [ ] Pass / [ ] Fail
- .srt: [ ] Pass / [ ] Fail
- .pdf: [ ] Pass / [ ] Fail

---

## Scenario 4: Usage Limits

**Goal:** Verify limits enforce correctly

### Steps:
1. **Process 10 transcripts** (free tier limit)
   - [ ] Can process 1st through 10th
   - [ ] Usage counter increments (1/10, 2/10, etc.)

2. **Try to process 11th**
   - [ ] See error message
   - [ ] Cannot upload
   - [ ] Error is clear and helpful
   - [ ] Shows upgrade option (if implemented)

### Expected Results:
- ✅ Limit enforces at 10
- ✅ Clear error message
- ✅ Counter accurate

---

## Scenario 5: Tone Variations

**Goal:** Verify tone override works

### Steps:
1. **Process same transcript 4 times with different tones:**
   - [ ] Default (match brand voice)
   - [ ] More formal
   - [ ] More casual
   - [ ] Technical/data-focused

2. **Compare outputs:**
   - [ ] Formal version is noticeably more formal
   - [ ] Casual version uses contractions, friendly language
   - [ ] Technical version has more data/metrics
   - [ ] All still sound like brand voice (just adjusted)

### Expected Results:
- ✅ Tone differences are clear
- ✅ Brand voice still consistent

---

## Scenario 6: Regeneration

**Goal:** Can regenerate content with different settings

### Steps:
1. **Process transcript** (with LinkedIn, Blog, Email)
2. **Click "Regenerate All"**
   - [ ] Returns to settings screen
   - [ ] Previous selections shown
   - [ ] Change tone to "Casual"
   - [ ] Deselect Email
   - [ ] Generate again

3. **Verify:**
   - [ ] New content generated
   - [ ] Different from original
   - [ ] Old version still accessible
   - [ ] New version has casual tone
   - [ ] Email not generated this time

### Expected Results:
- ✅ Regeneration works
- ✅ History preserved

---

## Scenario 7: Error Handling

**Goal:** Graceful error handling

### Test Cases:

**7a. Corrupted File**
- [ ] Upload corrupted PDF
- [ ] See clear error: "Could not extract text from file"
- [ ] Can try again with different file

**7b. Too Large File**
- [ ] Upload 30MB file (over 25MB limit)
- [ ] See error before upload starts
- [ ] Error explains size limit

**7c. Wrong File Type**
- [ ] Upload .jpg image
- [ ] See error: "Unsupported file type"
- [ ] Lists supported types

**7d. API Failure** (simulate)
- [ ] Disable network mid-generation
- [ ] See "Connection lost" error
- [ ] Retry works when network restored

**7e. Empty Transcript**
- [ ] Upload file with no text
- [ ] See error: "Transcript appears empty"
- [ ] Can go back and try again

### Expected Results:
- ✅ All errors handled gracefully
- ✅ Error messages clear and actionable
- ✅ No crashes or blank screens

---

## Scenario 8: Mobile Responsiveness

**Goal:** Works well on mobile devices

### Test on iPhone/Android:
- [ ] Sign up works
- [ ] Onboarding readable
- [ ] File upload works
- [ ] Content selection usable
- [ ] Content library displays well
- [ ] Modal readable
- [ ] Copy/download works
- [ ] Navigation intuitive

### Expected Results:
- ✅ Fully functional on mobile
- ✅ No layout breaking
- ✅ Touch targets adequate

---

## Scenario 9: Browser Compatibility

**Goal:** Works across major browsers

### Test in each:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

**For each browser verify:**
- [ ] Sign up/login works
- [ ] File upload works
- [ ] Copy to clipboard works
- [ ] Downloads work
- [ ] No console errors

---

## Scenario 10: Real Content Quality Test

**Goal:** Validate with actual LiveData content

### Steps:
1. **Use real LiveData webinar transcript**
2. **Upload actual LiveData brand guide**
3. **Generate full content set**

4. **Quality checks:**
   - [ ] Brand voice sounds like LiveData
   - [ ] Content is accurate to transcript
   - [ ] No hallucinated facts
   - [ ] LinkedIn posts are engaging
   - [ ] Blog post is well-structured
   - [ ] Email sequence flows logically
   - [ ] Would actually use this content (minimal editing)

5. **Have LiveData marketing review:**
   - [ ] They recognize the voice
   - [ ] Content is usable
   - [ ] Saves them time vs manual
   - [ ] Would pay $300/month for this

### Expected Results:
- ✅ Content quality is high
- ✅ Matches brand voice
- ✅ Actually usable with <30% editing

---

## Performance Benchmarks

**Measure these:**
- [ ] Initial page load: <2 seconds
- [ ] Auth (login): <1 second
- [ ] Brand voice analysis: <30 seconds
- [ ] Transcript upload: <10 seconds for 10MB file
- [ ] Content generation (full set): <5 minutes
- [ ] Content library load: <1 second

---

## Security Checks

- [ ] Can't access other users' data
- [ ] API keys not exposed in frontend
- [ ] Can't bypass usage limits via URL manipulation
- [ ] SQL injection not possible (using Supabase safely)
- [ ] XSS not possible (React escapes by default, but verify)
- [ ] HTTPS enforced in production

---

## Pre-Launch Checklist

Before handing to LiveData:
- [ ] All critical paths tested
- [ ] No major bugs
- [ ] Error messages helpful
- [ ] Mobile works
- [ ] All browsers work
- [ ] Content quality validated
- [ ] Usage limits enforced
- [ ] Real LiveData content tested successfully

---

**Test Status:** Not started  
**Last Updated:** 2025-01-11  
**Tester:** [Your name]
```

---

Perfect! Now you have all the essential files created:

**Created files:**
1. ✅ README.md
2. ✅ /docs/PRD.md
3. ✅ /docs/TECHNICAL_SPEC.md
4. ✅ /docs/IMPLEMENTATION_GUIDE.md
5. ✅ /prompts/brand-voice-analysis.md
6. ✅ /prompts/content-generation/linkedin-post.md
7. ✅ /prompts/content-generation/blog-post.md
8. ✅ /prompts/content-generation/email-sequence.md
9. ✅ /database/schema.sql
10. ✅ /database/seed-data.sql
11. ✅ .env.example
12. ✅ /testing/test-scenarios.md

**Next step:** Open a new conversation with Claude Code and say:
```
I'm building a project called Content Amplifier. Read these files:
- /docs/IMPLEMENTATION_GUIDE.md
- /docs/TECHNICAL_SPEC.md
- /docs/PRD.md

Start with Phase 1: Foundation. Set up the project, create database schema, build authentication, and deploy to Vercel.

I'll provide Supabase and Anthropic API keys when you need them.