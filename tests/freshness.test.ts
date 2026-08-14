import { describe, it, expect } from 'vitest'
import { computeFreshnessFactor } from '../lib/verify-core'

describe('computeFreshnessFactor', () => {
  it('is 1.0 for fresh imagery (under a year)', () => {
    expect(computeFreshnessFactor(0)).toBe(1)
    expect(computeFreshnessFactor(364)).toBe(1)
  })

  it('decays linearly after a year', () => {
    // 365 → 1.0; halfway to the 5-year floor should be (1 + 0.4) / 2 = 0.7
    const midway = 365 + (5 * 365 - 365) / 2
    expect(computeFreshnessFactor(365)).toBeCloseTo(1.0, 5)
    expect(computeFreshnessFactor(midway)).toBeCloseTo(0.7, 5)
  })

  it('bottoms out at 0.4 for 5+ year-old imagery', () => {
    expect(computeFreshnessFactor(5 * 365)).toBe(0.4)
    expect(computeFreshnessFactor(20 * 365)).toBe(0.4)
  })

  it('treats unknown age as fully fresh', () => {
    expect(computeFreshnessFactor(null)).toBe(1)
  })
})
