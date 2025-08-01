import { describe, it, expect } from 'vitest'
import { extractVendorNip, extractBuyerNip } from '../pdfProcessor'

describe('NIP extraction', () => {
  it('extracts plain numeric vendor NIP', () => {
    const text = 'Sprzedawca: Test\nNIP: 1234567890\nNabywca: Foo'
    expect(extractVendorNip(text)).toBe('1234567890')
  })

  it('normalizes vendor NIP with hyphens', () => {
    const text = 'Sprzedawca: Test\nNIP: 123-456-78-90\nNabywca: Foo'
    expect(extractVendorNip(text)).toBe('1234567890')
  })

  it('extracts plain numeric buyer NIP', () => {
    const text = 'Nabywca: Bar\nNIP: 0987654321'
    expect(extractBuyerNip(text)).toBe('0987654321')
  })

  it('normalizes buyer NIP with spaces', () => {
    const text = 'Nabywca: Bar\nNIP: 123 456 78 90'
    expect(extractBuyerNip(text)).toBe('1234567890')
  })
})
