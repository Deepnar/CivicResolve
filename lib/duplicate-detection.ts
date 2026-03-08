/**
 * Duplicate Detection Algorithm for CivicResolve
 * 
 * This module implements intelligent duplicate detection for issues based on:
 * 1. Geolocation proximity (Haversine distance)
 * 2. Category matching
 * 3. Text similarity (title and description)
 * 
 * The algorithm is advisory only - it flags potential duplicates for admin review
 * rather than automatically merging issues.
 */

import { Database } from './database'
import { logger } from './logger'
import type { 
  DuplicateDetectionResult, 
  PossibleDuplicate,
  DuplicateDetectionConfig 
} from './types'

/**
 * Calculate Haversine distance between two points
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * 
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * 
    Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = earthRadiusKm * c
  
  return distanceKm * 1000 // Convert to meters
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Used for text similarity calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  
  const len1 = s1.length
  const len2 = s2.length
  
  // Create a matrix to store distances
  const matrix: number[][] = []
  
  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }
  
  return matrix[len1][len2]
}

/**
 * Calculate text similarity using Levenshtein distance
 * @returns Similarity score between 0.0 and 1.0
 */
function calculateTextSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  
  if (maxLength === 0) return 1.0
  
  return 1 - (distance / maxLength)
}

/**
 * Calculate cosine similarity between two strings using word vectors
 * More sophisticated than Levenshtein for semantic similarity
 */
function calculateCosineSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/)
  const words2 = str2.toLowerCase().split(/\s+/)
  
  // Create a set of unique words
  const uniqueWords = new Set([...words1, ...words2])
  
  // Create word frequency vectors
  const vector1: number[] = []
  const vector2: number[] = []
  
  for (const word of uniqueWords) {
    vector1.push(words1.filter(w => w === word).length)
    vector2.push(words2.filter(w => w === word).length)
  }
  
  // Calculate dot product
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0
  
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i]
    magnitude1 += vector1[i] * vector1[i]
    magnitude2 += vector2[i] * vector2[i]
  }
  
  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0
  
  return dotProduct / (magnitude1 * magnitude2)
}

/**
 * Calculate combined text similarity using both methods
 * @returns Similarity score between 0.0 and 1.0
 */
function calculateCombinedSimilarity(str1: string, str2: string): number {
  const levenshteinSim = calculateTextSimilarity(str1, str2)
  const cosineSim = calculateCosineSimilarity(str1, str2)
  
  // Weight cosine similarity more heavily for longer texts
  const weight = Math.min(str1.split(/\s+/).length, str2.split(/\s+/).length) > 10 ? 0.7 : 0.5
  
  return (cosineSim * weight) + (levenshteinSim * (1 - weight))
}

/**
 * Get duplicate detection configuration from database
 */
export async function getDuplicateDetectionConfig(): Promise<DuplicateDetectionConfig> {
  try {
    const sql = 'SELECT config_key, config_value FROM duplicate_detection_config'
    const rows = await Database.query<{ config_key: string; config_value: string }>(sql)
    
    const config: any = {}
    for (const row of rows) {
      const value = row.config_value
      
      // Parse values based on type
      if (value === 'true') config[row.config_key] = true
      else if (value === 'false') config[row.config_key] = false
      else if (!isNaN(parseFloat(value))) config[row.config_key] = parseFloat(value)
      else config[row.config_key] = value
    }
    
    return {
      similarity_threshold: config.similarity_threshold || 0.50,
      distance_threshold_meters: config.distance_threshold_meters || 50,
      enabled: config.enabled !== false,
      auto_merge_enabled: config.auto_merge_enabled === true,
      check_same_category_only: config.check_same_category_only !== false,
      title_weight: config.title_weight || 0.4,
      description_weight: config.description_weight || 0.4,
      location_weight: config.location_weight || 0.2,
    }
  } catch (error) {
    logger.error('Failed to load duplicate detection config', error instanceof Error ? error : undefined)
    
    // Return default config
    return {
      similarity_threshold: 0.50,
      distance_threshold_meters: 50,
      enabled: true,
      auto_merge_enabled: false,
      check_same_category_only: true,
      title_weight: 0.4,
      description_weight: 0.4,
      location_weight: 0.2,
    }
  }
}

/**
 * Check if a pair of issues should be ignored (previously marked as separate)
 */
async function shouldIgnorePair(issueId1: number, issueId2: number): Promise<boolean> {
  try {
    const sql = `
      SELECT COUNT(*) as count 
      FROM duplicate_ignore_pairs 
      WHERE issue_id_1 = ? AND issue_id_2 = ?
    `
    const result = await Database.queryOne<{ count: number }>(sql, [
      Math.min(issueId1, issueId2),
      Math.max(issueId1, issueId2),
    ])
    
    return (result?.count || 0) > 0
  } catch (error) {
    logger.error('Error checking ignore pairs', error instanceof Error ? error : undefined)
    return false
  }
}

/**
 * Find potential duplicate issues for a new issue
 * @param issueData The new issue data to check
 * @returns Detection result with possible duplicates
 */
export async function detectDuplicates(issueData: {
  title: string
  description: string
  category: string
  latitude: number
  longitude: number
  excludeIssueId?: number // For checking updates to existing issues
}): Promise<DuplicateDetectionResult> {
  try {
    const config = await getDuplicateDetectionConfig()
    
    logger.info(`🔍 Starting duplicate detection with config:`, 'DuplicateDetection', {
      similarity_threshold: config.similarity_threshold,
      distance_threshold_meters: config.distance_threshold_meters,
      check_same_category_only: config.check_same_category_only,
      title_weight: config.title_weight,
      description_weight: config.description_weight,
      location_weight: config.location_weight,
    })
    
    logger.info(`📍 New issue details:`, 'DuplicateDetection', {
      title: issueData.title.substring(0, 50),
      category: issueData.category,
      latitude: issueData.latitude,
      longitude: issueData.longitude,
    })
    
    // If duplicate detection is disabled, return no duplicates
    if (!config.enabled) {
      return {
        isDuplicate: false,
        possibleDuplicates: [],
      }
    }
    
    // Build query to find nearby issues - only show root issues (not already-linked duplicates)
    let sql = `
      SELECT 
        i.id,
        i.title,
        i.description,
        i.category,
        i.status,
        i.latitude,
        i.longitude,
        i.address,
        i.reporter_id,
        i.created_at,
        i.possible_duplicate_of,
        CASE WHEN i.is_anonymous = TRUE THEN 'Anonymous Citizen' ELSE u.name END as reporter_name,
        (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes_count,
        (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comments_count,
        (SELECT COUNT(*) FROM issues linked WHERE linked.possible_duplicate_of = i.id AND linked.duplicate_status = 'MERGED') as linked_count
      FROM issues i
      LEFT JOIN users u ON i.reporter_id = u.id
      WHERE i.status NOT IN ('RESOLVED', 'REJECTED', 'CLOSED_DUPLICATE')
        AND i.duplicate_status NOT IN ('MERGED')
        AND i.possible_duplicate_of IS NULL
    `
    
    const params: any[] = []
    
    // Filter by category if configured
    if (config.check_same_category_only) {
      sql += ` AND i.category = ?`
      params.push(issueData.category)
    }
    
    // Exclude the current issue if updating
    if (issueData.excludeIssueId) {
      sql += ` AND i.id != ?`
      params.push(issueData.excludeIssueId)
    }
    
    sql += ` ORDER BY i.created_at DESC LIMIT 100`
    
    const nearbyIssues = await Database.query<any>(sql, params)
    
    logger.info(`📊 Found ${nearbyIssues.length} candidate issues to check`)
    
    // Calculate similarity for each nearby issue
    const possibleDuplicates: PossibleDuplicate[] = []
    
    for (const issue of nearbyIssues) {
      const distance = calculateDistance(
        issueData.latitude,
        issueData.longitude,
        parseFloat(issue.latitude),
        parseFloat(issue.longitude)
      )
      
      logger.info(`🔎 Checking issue #${issue.id}: distance=${distance.toFixed(2)}m`)
      
      // Skip if too far away
      if (distance > config.distance_threshold_meters) {
        logger.info(`  ❌ Skipped: too far (>${config.distance_threshold_meters}m)`)
        continue
      }
      
      // Check if this pair should be ignored
      if (issueData.excludeIssueId) {
        const shouldIgnore = await shouldIgnorePair(issueData.excludeIssueId, issue.id)
        if (shouldIgnore) {
          logger.info(`  ❌ Skipped: in ignore list`)
          continue
        }
      }
      
      // Calculate text similarity
      const titleSimilarity = calculateCombinedSimilarity(issueData.title, issue.title)
      const descriptionSimilarity = calculateCombinedSimilarity(issueData.description, issue.description)
      
      // Calculate location similarity (inverse of normalized distance)
      const locationSimilarity = 1 - (distance / config.distance_threshold_meters)
      
      // Calculate weighted overall similarity
      const overallSimilarity = 
        (titleSimilarity * config.title_weight) +
        (descriptionSimilarity * config.description_weight) +
        (locationSimilarity * config.location_weight)
      
      logger.info(`  📈 Similarity scores:`, 'DuplicateDetection', {
        title: titleSimilarity.toFixed(3),
        description: descriptionSimilarity.toFixed(3),
        location: locationSimilarity.toFixed(3),
        overall: overallSimilarity.toFixed(3),
        threshold: config.similarity_threshold,
      })
      
      // Add to possible duplicates if above threshold
      if (overallSimilarity >= config.similarity_threshold) {
        logger.info(`  ✅ DUPLICATE FOUND! (${(overallSimilarity * 100).toFixed(1)}%)`)
        possibleDuplicates.push({
          issueId: issue.id,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          status: issue.status,
          latitude: parseFloat(issue.latitude),
          longitude: parseFloat(issue.longitude),
          address: issue.address,
          reporterId: issue.reporter_id,
          reporterName: issue.reporter_name,
          createdAt: new Date(issue.created_at),
          distanceMeters: Math.round(distance * 10) / 10, // Round to 1 decimal
          similarityScore: Math.round(overallSimilarity * 100) / 100, // Round to 2 decimals
          titleSimilarity: Math.round(titleSimilarity * 100) / 100,
          descriptionSimilarity: Math.round(descriptionSimilarity * 100) / 100,
          votes_count: issue.votes_count || 0,
          comments_count: issue.comments_count || 0,
          linked_count: issue.linked_count || 0,
        })
      } else {
        logger.info(`  ❌ Below threshold (${(overallSimilarity * 100).toFixed(1)}% < ${(config.similarity_threshold * 100).toFixed(1)}%)`)
      }
    }
    
    // Sort by similarity score descending
    possibleDuplicates.sort((a, b) => b.similarityScore - a.similarityScore)
    
    const isDuplicate = possibleDuplicates.length > 0
    const bestMatch = possibleDuplicates.length > 0 ? possibleDuplicates[0] : undefined
    
    logger.info(
      `Duplicate detection complete: ${possibleDuplicates.length} potential duplicates found`
    )
    
    return {
      isDuplicate,
      possibleDuplicates: possibleDuplicates.slice(0, 5), // Return top 5
      similarityScore: bestMatch?.similarityScore,
      bestMatch,
    }
  } catch (error) {
    logger.error('Error detecting duplicates', error instanceof Error ? error : undefined, 'duplicate-detection')
    
    // On error, return no duplicates rather than failing the request
    return {
      isDuplicate: false,
      possibleDuplicates: [],
    }
  }
}

/**
 * Store duplicate detection result in the issue record
 */
export async function storeDuplicateDetection(
  issueId: number,
  detectionResult: DuplicateDetectionResult
): Promise<void> {
  try {
    if (!detectionResult.isDuplicate || !detectionResult.bestMatch) {
      // No duplicates found - ensure fields are null
      await Database.update(
        `UPDATE issues 
         SET possible_duplicate_of = NULL, 
             duplicate_confidence = NULL, 
             duplicate_status = 'PENDING'
         WHERE id = ?`,
        [issueId]
      )
      return
    }
    
    // Store the best match as possible duplicate
    await Database.update(
      `UPDATE issues 
       SET possible_duplicate_of = ?, 
           duplicate_confidence = ?, 
           duplicate_status = 'PENDING'
       WHERE id = ?`,
      [detectionResult.bestMatch.issueId, detectionResult.bestMatch.similarityScore, issueId]
    )
    
    // Log to audit table
    await Database.insert(
      `INSERT INTO duplicate_detection_audit 
       (issue_id, action_type, details, similarity_score, distance_meters) 
       VALUES (?, 'AUTO_DETECTED', ?, ?, ?)`,
      [
        issueId,
        JSON.stringify({
          possible_duplicate_of: detectionResult.bestMatch.issueId,
          possible_duplicates_count: detectionResult.possibleDuplicates.length,
        }),
        detectionResult.bestMatch.similarityScore,
        detectionResult.bestMatch.distanceMeters,
      ]
    )
    
    logger.info(
      `Stored duplicate detection for issue ${issueId}: possible duplicate of ${detectionResult.bestMatch.issueId}`
    )
  } catch (error) {
    logger.error('Error storing duplicate detection', error instanceof Error ? error : undefined, 'duplicate-detection')
    // Don't throw - this is non-critical
  }
}

/**
 * Update duplicate detection config
 */
export async function updateDuplicateDetectionConfig(
  updates: Partial<DuplicateDetectionConfig>,
  adminId: number
): Promise<void> {
  try {
    for (const [key, value] of Object.entries(updates)) {
      await Database.update(
        `UPDATE duplicate_detection_config 
         SET config_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE config_key = ?`,
        [String(value), adminId, key]
      )
    }
    
    logger.info(`Duplicate detection config updated by admin ${adminId}`)
  } catch (error) {
    logger.error('Error updating duplicate detection config', error instanceof Error ? error : undefined)
    throw error
  }
}

export const DuplicateDetection = {
  detectDuplicates,
  storeDuplicateDetection,
  getDuplicateDetectionConfig,
  updateDuplicateDetectionConfig,
  calculateDistance,
  calculateTextSimilarity: calculateCombinedSimilarity,
}
