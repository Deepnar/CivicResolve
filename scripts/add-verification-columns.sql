-- Add AI Observation Engine columns to the issues table
-- Follows the scripts/add-*.sql convention (raw SQL — the app uses mysql2,
-- not Prisma, and the WhatsApp bridge shares this schema via symlink).
-- Run once:  mysql -u <user> -p <db> < scripts/add-verification-columns.sql
-- Keep in sync with prisma/schema.prisma (Issue model).

ALTER TABLE issues
    ADD COLUMN verification_verdict VARCHAR(20) NULL COMMENT 'same_issue | different_issue | unclear | no_issue',
    ADD COLUMN verification_confidence DOUBLE NULL,
    ADD COLUMN verification_reason TEXT NULL,
    ADD COLUMN verification_image_url LONGTEXT NULL COMMENT 'external street photo used as evidence',
    ADD COLUMN verification_source VARCHAR(20) NULL COMMENT 'ola | mapillary | kartaview',
    ADD COLUMN verification_captured_at DATETIME NULL,
    ADD COLUMN verification_distance_m DOUBLE NULL,
    ADD COLUMN verified_at DATETIME NULL,
    ADD COLUMN resolution_verdict VARCHAR(20) NULL COMMENT 'fixed | not_fixed | unclear',
    ADD COLUMN resolution_confidence DOUBLE NULL,
    ADD COLUMN resolution_checked_at DATETIME NULL,
    ADD COLUMN resolution_street_url LONGTEXT NULL COMMENT 'post-resolution street cross-check photo',
    ADD COLUMN resolution_street_captured_at DATETIME NULL,
    ADD COLUMN resolution_street_verdict VARCHAR(20) NULL COMMENT 'still_present | not_present | unclear',
    ADD COLUMN duplicate_vision_checked BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'AI vision dup-sweep done (worker)',
    ADD COLUMN verification_attempted_at DATETIME NULL COMMENT 'last auto-verify attempt (backoff for no-imagery locations)';

-- Backfill: issues already linked as duplicates are considered vision-checked
-- (their admin-confirmed link is the answer; no need to re-sweep).
UPDATE issues SET duplicate_vision_checked = TRUE WHERE possible_duplicate_of IS NOT NULL;
