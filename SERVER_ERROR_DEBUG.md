# Internal Server Error - Debugging Guide

## What's Happening
The backend is returning a 500 "Internal Server Error" when you submit the quiz. This means the server encountered an error while processing your submission.

## Step-by-Step Debugging

### Step 1: Enable Console Logging
1. Open your browser DevTools: **F12**
2. Click **Console** tab
3. Keep the console open

### Step 2: Submit a Quiz and Capture Logs

**When you submit, look for these console messages:**

```
[Submission] Validating payload: {...}
[submitQuiz] Sending: {...}
Prepared answers for submission: {...}
```

**Copy the complete logs showing:**
- `totalQuestions` vs `answeredCount`
- What the `sampleAnswers` look like
- The exact answer formats being sent

### Step 3: Check Network Response
1. Go to **Network** tab in DevTools
2. Clear network history
3. Submit quiz
4. Find the request ending with `/submit`
5. Click it
6. Go to **Response** tab

**Share what you see in the Response - this is the actual server error**

## Common Issues & Solutions

### Issue 1: Question IDs Mismatch
**Symptom**: Console shows question IDs like `"q_1"` or `"001"` but they don't match

**Solution**: The backend might expect different ID format - check the API docs

### Issue 2: Answer Format Wrong  
**Symptom**: Multi-select shows `"A|B"` but backend expects `["A","B"]`

**Solution**: Let us know the format you're seeing

### Issue 3: Empty/Null Answers
**Symptom**: Some questions have empty string answers when they shouldn't

**Solution**: Make sure all questions have an answer (even if just blank)

### Issue 4: Special Characters
**Symptom**: Answer contains special characters that break JSON

**Solution**: The client should auto-escape these

## Information to Collect

Before sharing with team, collect:

1. **Console logs** (F12 → Console):
   ```
   - Submission payload details
   - Sample answer values
   - Total answer count
   ```

2. **Network response** (F12 → Network → Request):
   ```
   - Exact error message from server
   - Any details about what failed
   ```

3. **Answer format samples**:
   ```
   - Is multi-select showing as "A|B" or something else?
   - Are empty answers showing as "" or null?
   - What question types are being submitted?
   ```

4. **Quiz details**:
   ```
   - How many questions does the quiz have?
   - What question types (MULTIPLE_CHOICE, MULTI_SELECT, etc)?
   - Did you answer all of them?
   ```

## Quick Test: Submit with Right-Click

1. Right-click on browser
2. Select **Inspect** (or press F12)
3. Go to **Console** tab
4. Submit quiz
5. Take screenshot of ALL console output

## If Still Not Working

Try these steps:

1. **Test a single-question quiz first**
   - Submit with just 1 MULTIPLE_CHOICE question
   - See if it works

2. **Test different question types one by one**
   - Test MULTIPLE_CHOICE alone
   - Test FILL_IN_BLANK alone
   - Test TRUE_FALSE alone
   - Test MULTI_SELECT alone

3. **Test with different answer types**
   - Answer with simple text
   - Answer with numbers
   - Answer with special characters

## Most Likely Cause

Based on the error "Internal server error", the issue is usually ONE of:

1. **Answer format doesn't match backend expectations**
   - Multi-select might need array format instead of pipe-separated
   - Options might be indices instead of text
   
2. **Question IDs don't match**
   - Backend expects `"question_1"` but app sends `"1"`
   - Or vice versa
   
3. **Attempted validation failing**
   - Backend trying to match answers against known options
   - But normalized answer values don't match original options

4. **Payload size or structure issue**
   - Missing required fields in request body
   - Answer object structure not matching expectations

## Next Steps

1. Follow the debugging steps above
2. Copy the console errors
3. Copy the network response
4. Share both with your team/backend developer
5. They can tell you exactly what format is needed

---

**Note**: The app now logs detailed information to help debug. Everything in the console marked with `[...]` tags is for debugging this issue.
