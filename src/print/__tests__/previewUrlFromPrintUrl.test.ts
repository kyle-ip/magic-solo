import { describe, expect, it } from 'vitest'
import { previewUrlFromPrintUrl } from '../../utils/remoteAsset'

describe('previewUrlFromPrintUrl', () => {
  it('maps Scryfall cards png to normal jpeg', () => {
    const png =
      'https://cards.scryfall.io/png/front/a/b/abcdef12-3456-7890-abcd-ef1234567890.png'
    expect(previewUrlFromPrintUrl(png)).toBe(
      'https://cards.scryfall.io/normal/front/a/b/abcdef12-3456-7890-abcd-ef1234567890.jpg',
    )
  })

  it('maps Scryfall backs png to normal jpeg', () => {
    const png =
      'https://backs.scryfall.io/png/a/b/abcdef12-3456-7890-abcd-ef1234567890.png'
    expect(previewUrlFromPrintUrl(png)).toBe(
      'https://backs.scryfall.io/normal/a/b/abcdef12-3456-7890-abcd-ef1234567890.jpg',
    )
  })

  it('leaves non-Scryfall URLs unchanged', () => {
    expect(previewUrlFromPrintUrl('blob:http://localhost/x')).toBe(
      'blob:http://localhost/x',
    )
    expect(previewUrlFromPrintUrl('/assets/cards/foo-front.png')).toBe(
      '/assets/cards/foo-front.png',
    )
  })
})
