/**
 * Utility functions for date handling with IST timezone conversion
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
 * Get the current IST time
 * @returns Current date/time in IST
 */
export function getCurrentISTTime(): Date {
  return convertToIST(new Date())
}
