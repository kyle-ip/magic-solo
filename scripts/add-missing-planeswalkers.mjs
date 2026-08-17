/**
 * Fetch Scryfall normals and inject 1 planeswalker into each missing Challenge deck.
 * Keeps deck size 60 by reducing a basic land by 1.
 */
import fs from 'fs'
import path from 'path'
import https from 'https'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'public/assets/cards/player')

const DECKS = [
  {
    file: 'wildfire.json',
    land: 'Mountain',
    name: 'Domri Rade',
    nameZh: '多米利·雷德',
    abilities: [
      { cost: 1, effect: { type: 'draw', amount: 1 } },
      { cost: -2, effect: { type: 'fight' } },
    ],
    loyalty: 3,
    cost: '{1}{R}{G}',
    cmc: 3,
  },
  {
    file: 'merfolk.json',
    land: 'Island',
    name: 'Kiora, the Crashing Wave',
    nameZh: '碎浪奇奥拉',
    abilities: [
      { cost: 1, effect: { type: 'draw', amount: 1 } },
      { cost: -2, effect: { type: 'bounce_creature' } },
    ],
    loyalty: 2,
    cost: '{2}{G}{U}',
    cmc: 4,
  },
  {
    file: 'akroan.json',
    land: 'Plains',
    name: 'Elspeth, Sun\'s Champion',
    nameZh: '太阳斗士艾紫培',
    abilities: [
      { cost: 1, effect: { type: 'draw', amount: 1 } },
      { cost: -3, effect: { type: 'destroy_creature' } },
    ],
    loyalty: 4,
    cost: '{4}{W}{W}',
    cmc: 6,
  },
  {
    file: 'nessian.json',
    land: 'Forest',
    name: 'Nissa, Worldwaker',
    nameZh: '唤世者妮莎',
    abilities: [
      { cost: 1, effect: { type: 'draw', amount: 1 } },
      { cost: -2, effect: { type: 'pump_target', power: 3, toughness: 3 } },
    ],
    loyalty: 3,
    cost: '{3}{G}{G}',
    cmc: 5,
  },
  {
    file: 'humans.json',
    land: 'Plains',
    name: 'Gideon, Ally of Zendikar',
    nameZh: '赞迪卡盟友基定',
    abilities: [
      { cost: 1, effect: { type: 'draw', amount: 1 } },
      { cost: -2, effect: { type: 'pump_target', power: 2, toughness: 2 } },
    ],
    loyalty: 4,
    cost: '{2}{W}{W}',
    cmc: 4,
  },
  {
    file: 'spirits.json',
    land: 'Island',
    name: 'Teferi, Time Raveler',
    nameZh: '时光旅人泰菲力',
    abilities: [
      { cost: 1, effect: { type: 'draw', amount: 1 } },
      { cost: -3, effect: { type: 'bounce_creature' } },
    ],
    loyalty: 4,
    cost: '{1}{W}{U}',
    cmc: 3,
  },
]

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'magic-solo/1.0',
            Accept: 'application/json',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            getJson(res.headers.location).then(resolve, reject)
            return
          }
          let data = ''
          res.on('data', (c) => (data += c))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(e)
            }
          })
        },
      )
      .on('error', reject)
  })
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'magic-solo/1.0',
            Accept: '*/*',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            file.close()
            fs.unlinkSync(dest)
            download(res.headers.location, dest).then(resolve, reject)
            return
          }
          res.pipe(file)
          file.on('finish', () => file.close(() => resolve()))
        },
      )
      .on('error', reject)
  })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  for (const spec of DECKS) {
    const deckPath = path.join(ROOT, 'src/data/cards/player', spec.file)
    const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'))
    if (deck.cards.some((c) => c.kind === 'planeswalker')) {
      console.log('skip (already has PW):', spec.file)
      continue
    }
    const q = encodeURIComponent(spec.name)
    const card = await getJson(
      `https://api.scryfall.com/cards/named?fuzzy=${q}`,
    )
    if (card.object === 'error') throw new Error(card.details || spec.name)
    const id = card.id
    const img =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal
    if (!img) throw new Error('no image for ' + spec.name)
    const local = path.join(OUT, `${id}-normal.jpg`)
    if (!fs.existsSync(local)) {
      await download(img, local)
      console.log('downloaded', spec.name)
    }
    const land = deck.cards.find((c) => c.name === spec.land && c.kind === 'land')
    if (!land || land.quantity < 2) throw new Error('land missing ' + spec.land)
    land.quantity -= 1
    deck.cards.push({
      id,
      quantity: 1,
      name: spec.name,
      nameZh: spec.nameZh,
      typeLine: card.type_line,
      typeLineZh: '传奇鹏洛客',
      oracleText: spec.abilities
        .map((a) => `${a.cost > 0 ? '+' : ''}${a.cost}: (Challenge ability)`)
        .join('\\n'),
      oracleTextZh: '（挑战：简化忠诚异能；每回合限一次。）',
      manaCost: spec.cost,
      cmc: spec.cmc,
      power: null,
      toughness: null,
      keywords: [],
      kind: 'planeswalker',
      effect: { type: 'none' },
      startingLoyalty: spec.loyalty,
      loyaltyAbilities: spec.abilities,
      image: `assets/cards/player/${id}-normal.jpg`,
    })
    fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2) + '\n')
    const total = deck.cards.reduce((s, c) => s + c.quantity, 0)
    console.log('updated', spec.file, 'total', total)
    await new Promise((r) => setTimeout(r, 100))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
