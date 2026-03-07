# Anonymous Issue Reporting Feature

## Overview

This feature allows users to submit civic issue reports anonymously while maintaining backend traceability for security, abuse prevention, and internal auditing.

## Key Features

✅ **User Privacy**: Reporter identity is hidden from public view and organization members when an issue is marked as anonymous
✅ **Backend Traceability**: `reporter_id` is still stored in the database for logging, moderation, and analytics
✅ **Visual Indicators**: Anonymous reports are clearly marked with 🕶️ icon
✅ **Cross-Platform**: Implemented in both Next.js web app and Flutter mobile app

---

## Database Changes

### Migration: `add_anonymous_reporting.sql`

```sql
-- Add is_anonymous column to issues table
ALTER TABLE issues 
ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE AFTER reporter_id,
ADD INDEX idx_is_anonymous (is_anonymous);

-- Create audit log table for tracking anonymous submissions
CREATE TABLE IF NOT EXISTS anonymous_submissions_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  reporter_id INT NOT NULL,
  ip_address_hash VARCHAR(64) NULL,
  user_agent_hash VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reporter (reporter_id),
  INDEX idx_issue (issue_id),
  INDEX idx_created_at (created_at)
);
```

### How to Apply Migration

**Development/Local:**
```bash
mysql -u root -p civicresolve_dev < migrations/add_anonymous_reporting.sql
```

**Production (use with caution):**
```bash
# 1. Backup database first
mysqldump -u root -p civicresolve_prod > backup_before_anon_feature.sql

# 2. Apply migration
mysql -u root -p civicresolve_prod < migrations/add_anonymous_reporting.sql

# 3. Verify
mysql -u root -p civicresolve_prod -e "DESCRIBE issues;"
```

---

## Implementation Details

### Backend (Next.js + TypeScript)

#### Updated Files:

1. **`lib/models.ts`**
   - Added `is_anonymous: boolean` to Issue interface
   - Updated `IssueModel.create()` to accept `is_anonymous` parameter
   - Modified SQL queries in `findById()`, `getAll()`, and `getByLocation()` to mask reporter name:
     ```sql
     CASE WHEN i.is_anonymous = TRUE THEN 'Anonymous Citizen' ELSE u.name END as reporter_name
     ```

2. **`lib/types.ts`**
   - Added `isAnonymous?: boolean` to Issue interface
   - Added `isAnonymous?: boolean` to CreateIssueData interface

3. **`app/api/issues/route.ts`**
   - Updated Zod schema to accept `is_anonymous: z.boolean().default(false)`
   - Modified POST endpoint to pass `is_anonymous` to IssueModel.create()
   - Added logging to indicate anonymous submissions

4. **`app/report/page.tsx`**
   - Added checkbox toggle with explanation text
   - Added state: `const [isAnonymous, setIsAnonymous] = useState(false)`
   - Sends `is_anonymous` field in API request body

5. **`components/ui/issue-card.tsx`**
   - Added 🕶️ icon indicator for anonymous reports

#### API Request/Response Example:

**POST /api/issues**
```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic issues",
  "category": "ROADS",
  "priority": "MEDIUM",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "address": "123 Main St",
  "image_url": "data:image/jpeg;base64,...",
  "is_anonymous": true
}
```

**Response:**
```json
{
  "issue": {
    "id": "123",
    "title": "Pothole on Main Street",
    "reporterId": "456",
    "isAnonymous": true,
    "reporter": {
      "id": "456",
      "name": "Anonymous Citizen",  // Masked
      "role": "CITIZEN"
    },
    ...
  }
}
```

---

### Frontend (Flutter + Dart)

#### Updated Files:

1. **`lib/models/issue.dart`**
   - Added `final bool isAnonymous` field to Issue class
   - Updated `fromJson()` to parse `isAnonymous` from API response
   - Added `isAnonymous` parameter to CreateIssueData class

2. **`lib/screens/issues/ai_report_screen.dart`**
   - Added `bool _isAnonymous = false` state variable
   - Added checkbox UI with explanation text (styled with Container + Row layout)
   - Passes `isAnonymous: _isAnonymous` when creating issue

3. **`lib/screens/report/manual_report_screen.dart`**
   - Same updates as AI report screen
   - Checkbox positioned before "Submit Report" button

4. **`lib/screens/issues/issue_detail_screen.dart`**
   - Updated reporter display to show 🕶️ icon when `issue.isAnonymous`
   - Changed icon from `Icons.person_outline` to `Icons.visibility_off_outlined` for anonymous reports

---

## Security & Privacy Considerations

### ✅ What's Protected

- **Public Identity**: Reporter name is replaced with "Anonymous Citizen" in all public-facing views
- **Organization Access**: Organization members and admins cannot see the real reporter identity
- **Comments/Votes**: Anonymous reporters can still interact with their own issues

### 🔒 What's Still Tracked

- `reporter_id` is **always stored** in the `issues` table
- Internal logs contain the actual user ID
- Audit logs can track anonymous submission patterns
- Admins can access raw database records if needed for moderation

### 🚨 Abuse Prevention Strategies

#### 1. Rate Limiting (Recommended Implementation)

Add to `app/api/issues/route.ts`:

```typescript
import { RateLimiter } from '@/lib/rate-limiter';

// In POST handler, before creating issue:
const identifier = issueData.is_anonymous 
  ? `anon-${user.id}` 
  : user.id.toString();

const rateLimit = await RateLimiter.check({
  identifier,
  limit: issueData.is_anonymous ? 5 : 10, // Stricter for anonymous
  window: 3600000 // 1 hour window
});

if (!rateLimit.allowed) {
  return Response.json(
    { error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 60000)} minutes` },
    { status: 429 }
  );
}
```

#### 2. Enhanced Logging

```typescript
// Log anonymous submissions with metadata
if (issueData.is_anonymous) {
  await Database.insert(
    `INSERT INTO anonymous_submissions_audit 
     (issue_id, reporter_id, ip_address_hash, user_agent_hash) 
     VALUES (?, ?, SHA2(?, 256), SHA2(?, 256))`,
    [
      issueId,
      user.id,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ]
  );
}
```

#### 3. Admin Review Tools

Create admin endpoint to view anonymous submission patterns:

```typescript
// app/api/admin/anonymous-audit/route.ts
export async function GET(request: NextRequest) {
  const user = await AuthUtils.requireAuth(request);
  if (user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const audit = await Database.query(`
    SELECT 
      a.reporter_id,
      u.name,
      u.email,
      COUNT(*) as anonymous_submission_count,
      MAX(a.created_at) as last_submission
    FROM anonymous_submissions_audit a
    JOIN users u ON a.reporter_id = u.id
    GROUP BY a.reporter_id
    HAVING COUNT(*) > 10 -- Flag users with excessive anonymous submissions
    ORDER BY COUNT(*) DESC
  `);

  return Response.json({ audit });
}
```

---

## UI/UX Design

### Web (Next.js)

**Toggle Design:**
```
┌─────────────────────────────────────────────────────┐
│ ☐ Submit this report anonymously                   │
│                                                     │
│ Your identity will not be visible publicly or to   │
│ organizations handling the issue. Your report      │
│ will be attributed to "Anonymous Citizen" for      │
│ privacy.                                            │
└─────────────────────────────────────────────────────┘
```

**Issue Card Display:**
- Anonymous: `👤 Anonymous Citizen 🕶️`
- Regular: `👤 John Doe`

### Mobile (Flutter)

**Toggle Design:**
```dart
Container(
  padding: EdgeInsets.all(12),
  decoration: BoxDecoration(
    color: Colors.grey.shade50,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: Colors.grey.shade200),
  ),
  child: Row(
    children: [
      Checkbox(...),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Submit this report anonymously', ...),
            Text('Your identity will not be visible...', ...),
          ],
        ),
      ),
    ],
  ),
)
```

---

## Testing Checklist

### Manual Testing

- [ ] Create anonymous issue via web form
- [ ] Create anonymous issue via Flutter app (AI report)
- [ ] Create anonymous issue via Flutter app (manual report)
- [ ] Verify issue shows "Anonymous Citizen" in issue list
- [ ] Verify issue shows "Anonymous Citizen" in issue detail page
- [ ] Verify reporter can still comment on their anonymous issue
- [ ] Verify reporter can still vote on their anonymous issue
- [ ] Verify organization members cannot see real reporter identity
- [ ] Verify database still stores actual `reporter_id`
- [ ] Verify audit log is created for anonymous submissions
- [ ] Test rate limiting for anonymous submissions
- [ ] Verify admin can query anonymous_submissions_audit table

### Database Queries for Testing

```sql
-- Check anonymous issues
SELECT id, title, reporter_id, is_anonymous FROM issues WHERE is_anonymous = TRUE;

-- Check audit logs
SELECT * FROM anonymous_submissions_audit ORDER BY created_at DESC LIMIT 10;

-- Find users with multiple anonymous submissions
SELECT reporter_id, COUNT(*) as count 
FROM anonymous_submissions_audit 
GROUP BY reporter_id 
HAVING COUNT(*) > 3;
```

---

## Analytics & Reporting

### Useful Queries

**Anonymous vs. Regular Submission Ratio:**
```sql
SELECT 
  SUM(CASE WHEN is_anonymous THEN 1 ELSE 0 END) as anonymous_count,
  SUM(CASE WHEN is_anonymous THEN 0 ELSE 1 END) as regular_count,
  ROUND(AVG(is_anonymous) * 100, 2) as anonymous_percentage
FROM issues;
```

**Anonymous Issues by Category:**
```sql
SELECT 
  category,
  COUNT(*) as total,
  SUM(is_anonymous) as anonymous,
  ROUND(SUM(is_anonymous) / COUNT(*) * 100, 2) as anon_pct
FROM issues
GROUP BY category
ORDER BY anon_pct DESC;
```

**Anonymous Submission Trends Over Time:**
```sql
SELECT 
  DATE(created_at) as date,
  SUM(is_anonymous) as anonymous_submissions,
  COUNT(*) as total_submissions
FROM issues
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Rollback Plan

If issues arise, revert the feature:

```sql
-- Remove is_anonymous column (reverses migration)
ALTER TABLE issues DROP COLUMN is_anonymous;

-- Drop audit table
DROP TABLE IF EXISTS anonymous_submissions_audit;
```

Then revert code changes via Git:
```bash
git revert <commit-hash-of-anonymous-feature>
```

---

## Future Enhancements

1. **Admin Dashboard**: Add UI for viewing anonymous submission audit logs
2. **ML-Based Abuse Detection**: Flag suspicious patterns automatically
3. **Anonymous Appeal System**: Allow anonymous reporters to appeal issue status without revealing identity
4. **Configurable Settings**: Let admins enable/disable anonymous reporting per category
5. **Enhanced Analytics**: Dashboard showing anonymous submission trends

---

## Credits

Implemented by: [Your Name]
Date: March 7, 2026
Version: 1.0.0

---

## License & Legal

Ensure compliance with:
- GDPR (if serving EU users)
- CCPA (if serving California users)
- Local data protection laws

**Privacy Policy Updates Needed:**
- Disclose that reporter_id is stored even for anonymous submissions
- Explain audit logging purposes
- Describe data retention policies for audit logs
