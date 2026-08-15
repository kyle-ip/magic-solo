import type { EditorFrameId } from './types'

/**
 * Modern-frame (8ED–era) palette tuned from printed card scans
 * (e.g. Fifth Dawn Tornado Elemental) — mottled mid-tones, not neon flats.
 */
export interface FramePalette {
  /** Primary frame fill (mid). */
  plate: string
  /** Darker vein / shade. */
  plateDark: string
  /** Lighter mottling highlight. */
  plateLight: string
  /** Soft tint washed into the text box. */
  textBox: string
  textBoxEdge: string
  textInk: string
  nameInk: string
  border: string
  /** Metallic PT plate. */
  ptLight: string
  ptMid: string
  ptDark: string
  ptInk: string
  /** Bevel / inset helpers. */
  bevelDark: string
  bevelLight: string
  footerInk: string
}

const PALETTES: Record<Exclude<EditorFrameId, 'auto'>, FramePalette> = {
  white: {
    plate: '#e8e0b8',
    plateDark: '#c9bf8e',
    plateLight: '#f4efd4',
    textBox: '#f7f3e6',
    textBoxEdge: '#d8d0b4',
    textInk: '#14120e',
    nameInk: '#10100c',
    border: '#0c0c0c',
    ptLight: '#f2efe6',
    ptMid: '#ddd6c4',
    ptDark: '#b0a890',
    ptInk: '#10100c',
    bevelDark: 'rgba(40,35,20,0.55)',
    bevelLight: 'rgba(255,250,230,0.35)',
    footerInk: 'rgba(20,18,12,0.85)',
  },
  blue: {
    plate: '#2f6fa0',
    plateDark: '#1e4f78',
    plateLight: '#5a93bb',
    textBox: '#dce8f0',
    textBoxEdge: '#a8c0d4',
    textInk: '#0e1820',
    nameInk: '#060c12',
    border: '#060a10',
    ptLight: '#eef3f7',
    ptMid: '#c8d4e0',
    ptDark: '#8fa0b0',
    ptInk: '#0a1016',
    bevelDark: 'rgba(8,24,40,0.55)',
    bevelLight: 'rgba(200,220,240,0.28)',
    footerInk: 'rgba(6,12,18,0.88)',
  },
  black: {
    plate: '#3d3934',
    plateDark: '#24201c',
    plateLight: '#5a544c',
    textBox: '#e6dfd4',
    textBoxEdge: '#b8aea0',
    textInk: '#12100e',
    nameInk: '#050403',
    border: '#050403',
    ptLight: '#ece6dc',
    ptMid: '#c8c0b4',
    ptDark: '#8a8278',
    ptInk: '#0c0a08',
    bevelDark: 'rgba(0,0,0,0.55)',
    bevelLight: 'rgba(220,210,195,0.22)',
    footerInk: 'rgba(245,240,230,0.78)',
  },
  red: {
    plate: '#b33a2e',
    plateDark: '#7a221c',
    plateLight: '#d45a48',
    textBox: '#f0ddd6',
    textBoxEdge: '#c8a098',
    textInk: '#160c0a',
    nameInk: '#0c0604',
    border: '#100606',
    ptLight: '#f2e8e4',
    ptMid: '#d4c0b8',
    ptDark: '#987870',
    ptInk: '#100808',
    bevelDark: 'rgba(40,8,6,0.55)',
    bevelLight: 'rgba(255,210,200,0.22)',
    footerInk: 'rgba(8,4,4,0.88)',
  },
  green: {
    // Sampled toward Fifth Dawn Tornado Elemental forest green
    plate: '#4a6d45',
    plateDark: '#2f4a2c',
    plateLight: '#6a8f62',
    textBox: '#e6ede1',
    textBoxEdge: '#b4c4a8',
    textInk: '#10140e',
    nameInk: '#060806',
    border: '#0a0e0a',
    ptLight: '#f0eee8',
    ptMid: '#d4d0c4',
    ptDark: '#9a9688',
    ptInk: '#0c0c0a',
    bevelDark: 'rgba(12,24,10,0.55)',
    bevelLight: 'rgba(200,220,190,0.25)',
    footerInk: 'rgba(6,8,6,0.88)',
  },
  gold: {
    plate: '#c4a03a',
    plateDark: '#8a6e18',
    plateLight: '#e0c060',
    textBox: '#f2ead0',
    textBoxEdge: '#d0c090',
    textInk: '#141008',
    nameInk: '#0c0a04',
    border: '#100c04',
    ptLight: '#f4efd8',
    ptMid: '#ddd0a0',
    ptDark: '#a89050',
    ptInk: '#100c04',
    bevelDark: 'rgba(40,30,8,0.5)',
    bevelLight: 'rgba(255,235,180,0.3)',
    footerInk: 'rgba(10,8,4,0.88)',
  },
  artifact: {
    plate: '#8e8e8e',
    plateDark: '#5e5e5e',
    plateLight: '#b4b4b4',
    textBox: '#e8e8e6',
    textBoxEdge: '#b8b8b4',
    textInk: '#121212',
    nameInk: '#080808',
    border: '#0a0a0a',
    ptLight: '#f0f0ee',
    ptMid: '#d0d0ce',
    ptDark: '#90908c',
    ptInk: '#0a0a0a',
    bevelDark: 'rgba(0,0,0,0.45)',
    bevelLight: 'rgba(255,255,255,0.28)',
    footerInk: 'rgba(8,8,8,0.88)',
  },
  colorless: {
    plate: '#b8b4ac',
    plateDark: '#868278',
    plateLight: '#d4d0c8',
    textBox: '#efece6',
    textBoxEdge: '#c4c0b6',
    textInk: '#141210',
    nameInk: '#0a0a08',
    border: '#0c0c0a',
    ptLight: '#f2f0ea',
    ptMid: '#d6d2c8',
    ptDark: '#9a968c',
    ptInk: '#0c0c0a',
    bevelDark: 'rgba(20,18,14,0.45)',
    bevelLight: 'rgba(255,250,240,0.28)',
    footerInk: 'rgba(10,10,8,0.88)',
  },
  land: {
    plate: '#7a6240',
    plateDark: '#4e3c24',
    plateLight: '#a08858',
    textBox: '#ebe4d4',
    textBoxEdge: '#c4b498',
    textInk: '#141008',
    nameInk: '#0a0804',
    border: '#0e0a06',
    ptLight: '#f0eae0',
    ptMid: '#d4c8b0',
    ptDark: '#988870',
    ptInk: '#0c0a06',
    bevelDark: 'rgba(30,22,10,0.5)',
    bevelLight: 'rgba(240,220,180,0.25)',
    footerInk: 'rgba(8,6,4,0.88)',
  },
}

const COLOR_LETTER_TO_FRAME: Record<string, Exclude<EditorFrameId, 'auto'>> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
}

/** Infer frame from mana cost + type line when `frame === 'auto'`. */
export function resolveFrameId(
  frame: EditorFrameId,
  manaCost: string,
  typeLine: string,
): Exclude<EditorFrameId, 'auto'> {
  if (frame !== 'auto') return frame

  const type = typeLine.toLowerCase()
  if (/\bland\b/.test(type) && !/\bcreature\b/.test(type)) return 'land'
  if (/\bartifact\b/.test(type) && !/\bcreature\b/.test(type)) {
    const colors = colorsFromMana(manaCost)
    if (colors.length === 0) return 'artifact'
  }

  const colors = colorsFromMana(manaCost)
  if (colors.length === 0) {
    if (/\bartifact\b/.test(type)) return 'artifact'
    return 'colorless'
  }
  if (colors.length >= 2) return 'gold'
  return COLOR_LETTER_TO_FRAME[colors[0]] ?? 'colorless'
}

export function colorsFromMana(manaCost: string): string[] {
  const found = new Set<string>()
  for (const m of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const raw = m[1].toUpperCase()
    for (const letter of raw) {
      if ('WUBRG'.includes(letter)) found.add(letter)
    }
  }
  return [...found]
}

export function getFramePalette(
  frame: EditorFrameId,
  manaCost: string,
  typeLine: string,
): FramePalette {
  return PALETTES[resolveFrameId(frame, manaCost, typeLine)]
}

export function rarityStampColor(
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic',
): string {
  switch (rarity) {
    case 'mythic':
      return '#d4533b'
    case 'rare':
      return '#d4af37'
    case 'uncommon':
      return '#c5c8ce'
    default:
      return '#1a1a1a'
  }
}
