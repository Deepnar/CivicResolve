# Duplicate Issue Review System - Implementation Guide

## Overview

This document provides a comprehensive guide to the Duplicate Issue Review System implemented for CivicResolve. The system detects potential duplicate issues and provides an admin interface for review and resolution.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Setup](#database-setup)
3. [Backend Integration](#backend-integration)
4. [Frontend Integration](#frontend-integration)
5. [API Endpoints](#api-endpoints)
6. [Redis Caching Strategy](#redis-caching-strategy)
7. [Workflow Examples](#workflow-examples)
8. [Configuration](#configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Key Components

1. **Duplicate Detection Algorithm** (`lib/duplicate-detection.ts`)
   - Haversine distance calculation for geolocation proximity
   - Text similarity analysis (Levenshtein + Cosine similarity)
   - Configurable thresholds and weights
   - Advisory-only detection (no automatic merging)

2. **Database Models** (`lib/models.ts`)
   - `DuplicateRelationshipModel` - Tracks admin actions
   - `DuplicateDetectionAuditModel` - Audit trail
   - `DuplicateIgnorePairModel` - Prevents false positive re-flagging
   - `DuplicateReviewQueueModel` - Admin queue management

3. **API Endpoints** (`app/api/admin/duplicates/`)
   - `GET /api/admin/duplicates` - Fetch pending reviews
   - `POST /api/admin/duplicates/merge` - Merge issues
   - `POST /api/admin/duplicates/ignore` - Ignore false positive
   - `POST /api/admin/duplicates/separate` - Keep separate

4. **Admin Dashboard** (`app/admin/duplicates/page.tsx`)
   - Side-by-side issue comparison
   - Action buttons (Merge, Ignore, Keep Separate)
   - Filtering by category
   - Distance and similarity indicators

5. **Reporter Dialog** (`components/duplicate-confirmation-dialog.tsx`)
   - Pre-submission duplicate warning
   - User acknowledgement options
   - Reduces duplicate submissions

---

## Database Setup

### Step 1: Run Migration

Execute the migration script to add duplicate detection tables:

```bash
mysql -u your_username -p civicresolve_dev < migrations/add_duplicate_detection_system.sql
```

### Step 2: Verify Tables

Check that these tables were created:

```sql
SHOW TABLES LIKE 'duplicate%';
```

Expected output:
- `duplicate_relationships`
- `duplicate_detection_audit`
- `duplicate_ignore_pairs`
- `duplicate_detection_config`

### Step 3: Verify Issue Table Updates

```sql
DESCRIBE issues;
```

Should include new columns:
- `possible_duplicate_of`
- `duplicate_confidence`
- `duplicate_status`
- `reporter_confirmed_unique`
- `reporter_acknowledgement`
- `location_point` (spatial index)

### Step 4: Check Configuration

```sql
SELECT * FROM duplicate_detection_config;
```

Default configuration values should be present.

---

## Backend Integration

### Integration with Issue Creation

The duplicate detection is integrated into the issue creation flow in `app/api/issues/route.ts`:

```typescript
// 1. Run duplicate detection BEFORE creating the issue
const duplicateDetectionResult = await DuplicateDetection.detectDuplicates({
  title: issueData.title,
  description: issueData.description,
  category: issueData.category,
  latitude: issueData.latitude,
  longitude: issueData.longitude,
})

// 2. If duplicates found and user hasn't confirmed, return for review
if (duplicateDetectionResult.isDuplicate && !issueData.reporter_confirmed_unique) {
  return Response.json({
    duplicate_check_required: true,
    possible_duplicates: duplicateDetectionResult.possibleDuplicates,
  }, { status: 409 })
}

// 3. Create issue normally
const issueId = await IssueModel.create(issueData)

// 4. Store duplicate detection results
await DuplicateDetection.storeDuplicateDetection(issueId, duplicateDetectionResult)
```

### Key Features

- **Non-blocking**: Detection errors don't prevent issue creation
- **Configurable**: Thresholds adjustable via database
- **Logged**: All detections audited in `duplicate_detection_audit`
- **Smart caching**: Results cached with appropriate TTL

---

## Frontend Integration

### Admin Dashboard Usage

1. **Navigate to Admin Panel**
   ```
   /admin/duplicates
   ```

2. **Review Duplicate Pairs**
   - View side-by-side comparison
   - Check similarity score and distance
   - Review votes and comments on each issue

3. **Take Action**
   - **Merge**: Combine duplicate into original
   - **Ignore**: Mark as false positive
   - **Keep Separate**: Mark as different issues

### Reporter Flow Integration

Add the dialog to your issue submission form:

```tsx
import { DuplicateConfirmationDialog } from '@/components/duplicate-confirmation-dialog'

// In your form submission handler
const handleSubmit = async (data) => {
  try {
    const response = await fetch('/api/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (response.status === 409) {
      // Duplicates found
      const result = await response.json()
      setPossibleDuplicates(result.possible_duplicates)
      setShowDuplicateDialog(true)
      return
    }

    // Success - issue created
  } catch (error) {
    // Handle error
  }
}

// Dialog component
<DuplicateConfirmationDialog
  open={showDuplicateDialog}
  possibleDuplicates={possibleDuplicates}
  onConfirm={(acknowledgement) => {
    // Re-submit with confirmation
    handleSubmit({
      ...formData,
      reporter_confirmed_unique: true,
      reporter_acknowledgement: acknowledgement,
    })
  }}
  onCancel={() => setShowDuplicateDialog(false)}
/>
```

---

## API Endpoints

### GET /api/admin/duplicates

Fetch pending duplicate reviews.

**Query Parameters:**
- `category` (optional): Filter by category
- `limit` (optional, default: 20): Results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "items": [
    {
      "issue_id": 123,
      "issue_title": "Broken streetlight",
      "original_issue_id": 100,
      "original_title": "Street light not working",
      "similarity_score": 0.85,
      "distance_meters": 25.5,
      "issue_votes": 5,
      "original_votes": 12
    }
  ],
  "totalCount": 15,
  "totalPages": 1,
  "currentPage": 1
}
```

### POST /api/admin/duplicates/merge

Merge duplicate issue into original.

**Request Body:**
```json
{
  "original_issue_id": 100,
  "duplicate_issue_id": 123,
  "admin_comment": "Same location and issue"
}
```

**Actions Performed:**
1. Transfer all votes to original issue
2. Move all comments to original issue
3. Mark duplicate as `CLOSED_DUPLICATE`
4. Create relationship record
5. Send notification to duplicate reporter
6. Log to audit trail

**Response:**
```json
{
  "success": true,
  "message": "Issues merged successfully",
  "original_issue_id": 100,
  "duplicate_issue_id": 123
}
```

### POST /api/admin/duplicates/ignore

Ignore false positive detection.

**Request Body:**
```json
{
  "original_issue_id": 100,
  "duplicate_issue_id": 123,
  "admin_comment": "Different street sections"
}
```

**Actions Performed:**
1. Clear duplicate fields on issue
2. Set `duplicate_status` to `IGNORED`
3. Create relationship record
4. Log to audit trail

### POST /api/admin/duplicates/separate

Mark issues as separate and prevent future flagging.

**Request Body:**
```json
{
  "original_issue_id": 100,
  "duplicate_issue_id": 123,
  "admin_comment": "Different problems at same park",
  "reason": "One is about lighting, other is about litter"
}
```

**Actions Performed:**
1. Clear duplicate fields on issue
2. Set `duplicate_status` to `SEPARATE`
3. Add to `duplicate_ignore_pairs` table
4. Create relationship record
5. Log to audit trail

**Important**: Future duplicate detection will skip this pair.

---

## Redis Caching Strategy

### Cache Keys

```typescript
// Duplicate review queue
`admin:duplicates:all:${limit}:${offset}`
`admin:duplicates:${category}:${limit}:${offset}`

// Individual issues
`issue:${issueId}`

// Issue lists
`issues:*` // Wildcard for all issue list caches
```

### Cache TTL

```typescript
// Duplicate queue (1 minute)
SERVER_CACHE_TTL.SHORT

// Issue details (5 minutes)
SERVER_CACHE_TTL.MEDIUM

// Issue lists (10 minutes)
SERVER_CACHE_TTL.LONG
```

### Cache Invalidation

Caches are invalidated on:
- Issue creation
- Duplicate action (merge/ignore/separate)
- Issue status update

```typescript
await serverCacheInvalidate('admin:duplicates:*')
await serverCacheInvalidate(`issue:${issueId}`)
await serverCacheInvalidate('issues:*')
```

### Optimization Tips

1. **Batch Operations**: Use Redis pipelines for multiple operations
2. **Lazy Loading**: Cache populated on first request
3. **Granular Keys**: Specific keys for better invalidation control
4. **Compression**: Consider compressing large issue lists

---

## Workflow Examples

### Example 1: Citizen Reports Possible Duplicate

**Scenario**: User reports a pothole that's close to an existing report.

1. User fills out issue form and clicks "Submit"
2. Backend detects possible duplicate (85% similar, 30m away)
3. Dialog shows existing issue to user
4. User selects "A different issue nearby"
5. Issue created with `reporter_confirmed_unique = true`
6. Issue still flagged for admin review if confidence is high

### Example 2: Admin Merges Duplicate

**Scenario**: Admin reviews a clear duplicate.

1. Admin opens `/admin/duplicates`
2. Sees two identical streetlight reports
3. Clicks "Merge Issues"
4. System transfers 3 votes and 2 comments
5. Duplicate marked as `CLOSED_DUPLICATE`
6. Original reporter receives notification
7. Audit log entry created

### Example 3: Admin Marks as Separate

**Scenario**: Two issues at same park are different problems.

1. Admin reviews duplicate suggestion
2. Issue A: Broken swing
3. Issue B: Overflowing trash can
4. Admin clicks "Keep Separate"
5. Pair added to ignore list
6. Future detections will skip this pair

---

## Configuration

### Adjusting Detection Thresholds

Update values in `duplicate_detection_config` table:

```sql
-- Increase similarity threshold (more strict)
UPDATE duplicate_detection_config 
SET config_value = '0.85' 
WHERE config_key = 'similarity_threshold';

-- Decrease distance threshold (must be closer)
UPDATE duplicate_detection_config 
SET config_value = '30' 
WHERE config_key = 'distance_threshold_meters';

-- Adjust text vs location weights
UPDATE duplicate_detection_config 
SET config_value = '0.5' 
WHERE config_key = 'title_weight';

UPDATE duplicate_detection_config 
SET config_value = '0.3' 
WHERE config_key = 'description_weight';

UPDATE duplicate_detection_config 
SET config_value = '0.2' 
WHERE config_key = 'location_weight';
```

### Disable Detection (Temporarily)

```sql
UPDATE duplicate_detection_config 
SET config_value = 'false' 
WHERE config_key = 'enabled';
```

---

## Testing

### Manual Testing Checklist

#### Backend Testing

- [ ] Create issue near existing issue (< 50m)
- [ ] Verify duplicate detection runs
- [ ] Test merge action (votes/comments transfer)
- [ ] Test ignore action (clears duplicate status)
- [ ] Test separate action (adds to ignore pairs)
- [ ] Verify audit logging for all actions
- [ ] Test with identical titles
- [ ] Test with similar descriptions
- [ ] Test category filtering

#### Frontend Testing

- [ ] Admin dashboard loads duplicates
- [ ] Side-by-side comparison displays correctly
- [ ] Action buttons work
- [ ] Reporter dialog shows on duplicate detection
- [ ] User can confirm and continue submission
- [ ] Distance and similarity scores display
- [ ] Filtering by category works
- [ ] Pagination works

#### Performance Testing

- [ ] Duplicate detection completes < 200ms
- [ ] Admin queue loads < 500ms
- [ ] Merge operation completes < 1s
- [ ] Large issue lists don't timeout
- [ ] Database indexes used (check EXPLAIN)

### Automated Testing

Create test cases for:

1. **Distance Calculation**
   ```typescript
   expect(calculateDistance(40.7128, -74.0060, 40.7580, -73.9855)).toBeCloseTo(5000, 100)
   ```

2. **Text Similarity**
   ```typescript
   expect(calculateTextSimilarity('Broken streetlight', 'Street light broken')).toBeGreaterThan(0.7)
   ```

3. **Duplicate Detection**
   ```typescript
   const result = await detectDuplicates({
     title: 'Test issue',
     category: 'ROADS',
     latitude: 40.7128,
     longitude: -74.0060,
   })
   expect(result.isDuplicate).toBe(true)
   ```

---

## Troubleshooting

### Issue: Duplicate detection not running

**Symptoms**: Issues created without detection check

**Solutions**:
1. Check if detection is enabled:
   ```sql
   SELECT config_value FROM duplicate_detection_config WHERE config_key = 'enabled';
   ```
2. Check application logs for errors
3. Verify `duplicate-detection.ts` is imported correctly

### Issue: No duplicates showing in admin panel

**Symptoms**: Admin dashboard is empty despite similar issues

**Solutions**:
1. Check `duplicate_status = 'PENDING'` in database
2. Verify issues have `possible_duplicate_of` set
3. Check admin authentication
4. Clear Redis cache

### Issue: Distance calculation incorrect

**Symptoms**: Issues far apart flagged as near

**Solutions**:
1. Verify lat/lng are in correct order (lat, lng not lng, lat)
2. Check for negative coordinates
3. Verify spatial index created:
   ```sql
   SHOW INDEX FROM issues WHERE Key_name = 'idx_location_point';
   ```

### Issue: High false positive rate

**Symptoms**: Too many non-duplicates flagged

**Solutions**:
1. Increase similarity threshold (0.75 → 0.85)
2. Decrease distance threshold (50m → 30m)
3. Enable category-only checking
4. Adjust text similarity weights

### Issue: Merge fails with foreign key error

**Symptoms**: Database error during merge

**Solutions**:
1. Verify both issues exist
2. Check for circular duplicate references
3. Ensure issue not already merged
4. Check vote/comment foreign keys intact

---

## Performance Optimization

### Database Indexes

Verify these indexes exist:

```sql
SHOW INDEX FROM issues;
```

Critical indexes:
- `idx_duplicate_status` - Fast filtering by status
- `idx_location_point` - Spatial queries
- `idx_category` - Category filtering
- `idx_possible_duplicate` - Relationship lookups

### Query Optimization

Use `EXPLAIN` to check query performance:

```sql
EXPLAIN SELECT * FROM admin_duplicate_review_queue LIMIT 20;
```

Should use indexes, not full table scans.

### Caching Best Practices

1. **Cache duplicate queue** - Changes infrequently
2. **Don't cache detection results** - Real-time accuracy important
3. **Invalidate eagerly** - Better stale-free than fast-but-wrong
4. **Use Redis pipelines** - Batch cache operations

---

## Security Considerations

1. **Admin-only actions**: All duplicate management requires `ADMIN` role
2. **Audit logging**: All actions logged with admin ID
3. **Anonymous handling**: Reporter identity protected in duplicates
4. **SQL injection**: Using parameterized queries throughout
5. **Rate limiting**: Consider adding to admin endpoints

---

## Future Enhancements

### Potential Improvements

1. **Machine Learning**: Train model on confirmed duplicates/non-duplicates
2. **Image Similarity**: Compare uploaded images
3. **Batch Operations**: Merge multiple duplicates at once
4. **Auto-suggest**: Recommend action based on confidence
5. **Email Notifications**: Alert admins of high-confidence duplicates
6. **Mobile App**: Duplicate review in mobile interface
7. **Analytics Dashboard**: Track duplicate rates over time
8. **Export Reports**: Generate duplicate statistics

---

## Support

For issues or questions:
- Check logs in `/var/log/civicresolve/`
- Review database audit tables
- Contact development team

---

## Changelog

### Version 1.0.0 (2026-03-08)
- Initial implementation
- Haversine + text similarity algorithm
- Admin dashboard
- Reporter confirmation dialog
- MySQL + Redis integration
- Comprehensive documentation
