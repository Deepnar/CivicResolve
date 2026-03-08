# Duplicate Detection Feature - Testing Guide

## What Was Fixed (Updated: March 8, 2026)

### 🔧 Critical Fix: Infinite 409 Loop
**Issue**: After confirming duplicates, the API was detecting duplicates again and returning another 409, creating an infinite loop.

**Solution**: Updated API logic to check for `reporter_acknowledgement` before returning 409:
- First submission: No acknowledgement → Run detection → Return 409 if duplicates found
- Second submission: Has acknowledgement → Run detection BUT don't return 409 → Create issue
- The key change: Check `!issueData.reporter_acknowledgement` before returning 409

### 1. **API Route Logic** (app/api/issues/route.ts)
- ✅ Fixed: Only return 409 if user hasn't acknowledged duplicates yet
- ✅ Added: Proper handling for both "SAME_ISSUE" and "DIFFERENT_ISSUE" acknowledgements
- ✅ Added: Skip detection entirely for "DIFFERENT_ISSUE" (user confirmed unique)
- ✅ Added: Run detection but don't block for "SAME_ISSUE" (user acknowledged duplicate)
- ✅ Added: Comprehensive logging at each decision point

### 2. **handleDuplicateConfirmation Function** (app/report/page.tsx)
- ✅ Added null check for `pendingIssueData`
- ✅ Added comprehensive error logging to show actual API errors
- ✅ Improved error messages with validation details
- ✅ Added console logs for debugging
- ✅ Fixed state management to reopen dialog on error
- ✅ Properly reset state after successful submission

### 2. **DuplicateConfirmationDialog Component** (components/duplicate-confirmation-dialog.tsx)
- ✅ Added `useEffect` to reset selection when dialog opens
- ✅ All imports are present and correct
- ✅ Component properly wired with all callbacks

### 3. **Cancel Handler** (app/report/page.tsx)
- ✅ Properly resets all state variables:
  - `showDuplicateDialog`
  - `pendingIssueData`
  - `possibleDuplicates`
  - `isSubmitting`

### 4. **Enhanced Logging**
- ✅ Added logging when duplicates are detected
- ✅ Added logging when resubmitting with confirmation
- ✅ Added detailed error logging with status codes and error details

## How to Test the Feature

### Prerequisite
Make sure you have executed the SQL command to lower the similarity threshold:
```sql
UPDATE duplicate_detection_config 
SET config_value = '0.4', updated_at = CURRENT_TIMESTAMP 
WHERE config_key = 'similarity_threshold';
```

### Test Scenario 1: Create Duplicate Issue
1. **Navigate to Report Page**: Go to `/report`
2. **Upload an image** that you've used before
3. **Let AI auto-fill** the title and description
4. **Select the same or nearby location** as an existing issue
5. **Submit the form**

**Expected Result:**
- ⚠️ Dialog should appear showing similar issues
- You should see existing issues with:
  - Title and description
  - Distance (e.g., "25m away")
  - Similarity score (e.g., "85% similar")
  - Vote count
  - View full details link

### Test Scenario 2: User Confirms "Same Issue"
1. In the duplicate dialog, select **"The same issue"**
2. Click **"Continue with Submission"**

**Expected Result:**
- ✅ Issue is created successfully
- Toast shows: "Thanks for confirming! Your report has been linked to the existing issue."
- Redirected to home page
- Check console logs for: `✅ Issue submitted successfully after duplicate confirmation`

### Test Scenario 3: User Confirms "Different Issue"
1. In the duplicate dialog, select **"A different issue nearby"**
2. Click **"Continue with Submission"**

**Expected Result:**
- ✅ Issue is created successfully
- Toast shows: "Issue reported successfully!"
- Redirected to home page
- Issue is marked as `reporter_confirmed_unique = true`

### Test Scenario 4: User Cancels
1. In the duplicate dialog, click **"Cancel"**

**Expected Result:**
- ❌ Dialog closes
- Form remains filled
- No issue is created
- State is properly reset
- User can modify and resubmit

### Test Scenario 5: API Error Handling
1. Disconnect from network or cause an API error
2. Try to submit when duplicates are found
3. Confirm in the dialog

**Expected Result:**
- ❌ Error toast appears with specific error message
- Dialog reopens so user can try again
- Console shows detailed error with status code
- `isSubmitting` is properly reset

## What to Look For in Console

### First Submission (No duplicates):
```
🔍 Running duplicate detection for new issue: "Broken streetlight on..."
✅ No duplicates detected, proceeding with issue creation
✅ New issue created: #123 by John Doe (LIGHTING)
```

### First Submission (Duplicates found):
```
🔍 Running duplicate detection for new issue: "Broken streetlight on..."
⚠️ Found 2 possible duplicate(s) - returning for user confirmation
⚠️ Duplicate issues detected: 2
[timestamp] INFO [ReportPage] Duplicates found - showing confirmation dialog
```

### Resubmission After "Same Issue":
```
📤 Submitting issue with duplicate confirmation: {
  title: "Broken streetlight on...",
  acknowledgement: "SAME_ISSUE",
  reporter_confirmed_unique: false
}
🔍 Running duplicate detection for new issue: "Broken streetlight on..."
✅ User acknowledged duplicates (SAME_ISSUE), proceeding with creation
✅ New issue created: #124 by John Doe (LIGHTING)
📝 Reporter confirmation stored for issue #124 (acknowledgement: SAME_ISSUE)
✅ Issue submitted successfully after duplicate confirmation
```

### Resubmission After "Different Issue":
```
📤 Submitting issue with duplicate confirmation: {
  title: "Broken streetlight on...",
  acknowledgement: "DIFFERENT_ISSUE",
  reporter_confirmed_unique: true
}
✅ User confirmed uniqueness (DIFFERENT_ISSUE), skipping duplicate detection
✅ New issue created: #124 by John Doe (LIGHTING)
📝 Reporter confirmation stored for issue #124 (acknowledgement: DIFFERENT_ISSUE)
✅ Issue submitted successfully after duplicate confirmation
```

### On Error:
```
[timestamp] ERROR [ReportPage] Issue resubmission failed {
  status: 400,
  statusText: "Bad Request",
  errorData: {...}
}
```

## API Decision Flow

```
REQUEST: POST /api/issues
  ↓
Check: Has reporter_acknowledgement?
  ├─ NO → Run duplicate detection
  │         ├─ Duplicates found? → Return 409 with list
  │         └─ No duplicates → Create issue ✅
  │
  └─ YES (user already reviewed)
      ├─ "SAME_ISSUE" → Run detection, create issue with duplicate flag ✅
      └─ "DIFFERENT_ISSUE" → Skip detection, create issue normally ✅
```

## Key Changes in This Fix

1. **Before**: API checked `!reporter_confirmed_unique` to decide whether to return 409
   - Problem: "SAME_ISSUE" sets this to `false`, so detection would run again and return 409 again

2. **After**: API checks `!reporter_acknowledgement` to decide whether to return 409
   - Solution: If ANY acknowledgement is present, don't return 409 - the user already made a decision

3. **Detection Logic**:
   - No acknowledgement → run detection, return 409 if duplicates found
   - "SAME_ISSUE" acknowledgement → run detection, DON'T return 409, create with duplicate flag
   - "DIFFERENT_ISSUE" acknowledgement → skip detection entirely, create normally

## What to Look For in Console

### When Duplicates Are Detected:
```
⚠️ Duplicate issues detected: 2
[timestamp] INFO [ReportPage] Duplicates found - showing confirmation dialog
```

### When Resubmitting:
```
📤 Submitting issue with duplicate confirmation: {
  title: "Broken streetlight on...",
  acknowledgement: "DIFFERENT_ISSUE",
  reporter_confirmed_unique: true
}
[timestamp] INFO [ReportPage] Resubmitting issue with duplicate confirmation
```

### On Success:
```
✅ Issue submitted successfully after duplicate confirmation
```

### On Error:
```
[timestamp] ERROR [ReportPage] Issue resubmission failed {
  status: 400,
  statusText: "Bad Request",
  errorData: {...}
}
```

## Common Issues and Solutions

### Issue: "Server error: 409" on resubmission
**Cause**: API was running duplicate detection again after user confirmed
**Solution**: ✅ FIXED - API now checks for `reporter_acknowledgement` to skip returning 409

### Issue: "Pending issue data is null" Error
**Cause**: State was lost between dialog open and confirmation
**Solution**: ✅ FIXED - Added null check and shows user-friendly message

### Issue: Dialog doesn't show
**Cause**: API not returning 409 status or `possible_duplicates`
**Solution**: Check API logs, verify duplicate detection is running and threshold is not too high

### Issue: API returns validation error
**Cause**: Missing required fields in resubmission
**Solution**: Check console logs for `pendingDataKeys` to see what was stored

### Issue: Dialog selection not working
**Cause**: Radio buttons not properly bound
**Solution**: ✅ FIXED - Added useEffect to reset selection when dialog opens

## Feature Flow Diagram

```
User submits form
       ↓
  API checks for duplicates
       ↓
   Duplicates found?
   ├─ NO → Create issue ✅
   └─ YES → Return 409 with duplicates
              ↓
         Show dialog with similar issues
              ↓
         User makes choice:
         ├─ "Same Issue" → Resubmit with reporter_acknowledged = "SAME_ISSUE"
         ├─ "Different Issue" → Resubmit with reporter_confirmed_unique = true
         └─ Cancel → Close dialog, keep form data
```

## Files Modified

1. **app/api/issues/route.ts** (CRITICAL FIX)
   - Fixed infinite 409 loop by checking `reporter_acknowledgement` before returning 409
   - Added logic to skip detection for "DIFFERENT_ISSUE" acknowledgement
   - Added logic to run detection but not block for "SAME_ISSUE" acknowledgement
   - Enhanced logging at each decision point
   - Fixed storage of reporter confirmation flags

2. **app/report/page.tsx**
   - Enhanced `handleDuplicateConfirmation` with null checks and error handling
   - Improved logging in duplicate detection flow
   - Fixed cancel handler to reset all state
   - Added detailed error messages with validation details

3. **components/duplicate-confirmation-dialog.tsx**
   - Added `useEffect` to reset selection on dialog open
   - Properly imports all required components

4. **lib/duplicate-detection.ts**
   - Fixed logger.info() calls to use correct parameter order

## Next Steps

1. ✅ Test all scenarios above
2. ✅ Verify console logs show expected messages
3. ✅ Check database to confirm issues are created with correct flags
4. ✅ Test with different threshold values if needed
5. ✅ Test the "View full details" link to existing issues

## Database Verification

After submitting with duplicate confirmation, verify in database:

```sql
-- Check if issue was created with confirmation flags
SELECT 
  id, 
  title, 
  reporter_confirmed_unique, 
  reporter_acknowledgement,
  possible_duplicate_of,
  duplicate_status
FROM issues 
ORDER BY created_at DESC 
LIMIT 5;

-- Check duplicate detection audit log
SELECT * FROM duplicate_detection_audit 
ORDER BY created_at DESC 
LIMIT 10;
```

## Performance Notes

- Duplicate detection runs BEFORE issue creation
- Only checks issues within distance threshold (default 50m)
- Only checks issues in same category (configurable)
- Uses spatial indexing for fast proximity queries
- Results are stored in audit table for analytics
