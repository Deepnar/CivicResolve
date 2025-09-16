/**
 * Utility functions for date handling with proper timezone conversion
 */

/**
 * Convert UTC timestamp to IST (GMT+5:30)
 * @param utcDate - UTC date string or Date object
 * @returns Date object adjusted to IST
 */
export function convertToIST(utcDate: string | Date): Date {
  const date = new Date(utcDate)
  // IST is UTC+5:30, so add 5 hours and 30 minutes
  const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000))
  return istTime
}

/**
 * Convert UTC timestamp to user's local timezone
 * This is the preferred method for displaying timestamps to users
 * @param utcDate - UTC date string or Date object
 * @returns Date object in user's local timezone
 */
export function convertToUserTime(utcDate: string | Date): Date {
  // When creating a Date object from a UTC timestamp, JavaScript automatically
  // converts it to the user's local timezone
  return new Date(utcDate)
}

/**
 * Format timestamp for user display with proper timezone conversion
 * @param utcDate - UTC date string or Date object
 * @param options - date-fns formatting options
 * @returns Formatted distance string (e.g., "2 hours ago")
 */
export function formatTimeAgo(utcDate: string | Date): string {
  const { formatDistanceToNow } = require('date-fns')
  return formatDistanceToNow(convertToUserTime(utcDate), { addSuffix: true })
}

/**
 * Get the current IST time
 * @returns Current date/time in IST
 */
export function getCurrentISTTime(): Date {
  return convertToIST(new Date())
}

/**
 * Get current time in user's local timezone
 * @returns Current date/time in user's timezone
 */
export function getCurrentUserTime(): Date {
  return new Date()
}
