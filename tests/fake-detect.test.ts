import { describe, it, expect } from 'vitest'
import { hammingDistance, hashImage, REUSE_HAMMING_THRESHOLD } from '../lib/fake-detect'

// 1x1 PNG (transparent black) — tiny but decodable by sharp
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('hammingDistance', () => {
  it('is 0 for identical strings', () => {
    expect(hammingDistance('10101010', '10101010')).toBe(0)
  })

  it('counts differing bits', () => {
    expect(hammingDistance('1010', '1110')).toBe(1)
    expect(hammingDistance('0000', '1111')).toBe(4)
  })

  it('handles different lengths (min length)', () => {
    expect(hammingDistance('1010', '10101')).toBe(0)
  })
})

describe('hashImage', () => {
  it('produces a deterministic 256-bit hash for the same input', async () => {
    const a = await hashImage(TINY_PNG)
    const b = await hashImage(TINY_PNG)
    expect(a).toHaveLength(256)
    expect(a).toBe(b)
  })

  it('produces near-identical hashes for the same image bytes', async () => {
    const a = await hashImage(TINY_PNG)
    const b = await hashImage(TINY_PNG)
    expect(hammingDistance(a, b)).toBeLessThanOrEqual(REUSE_HAMMING_THRESHOLD)
  })
})
