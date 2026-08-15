import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const dir = path.join('src', 'data', 'cards', 'player')

function patch(file, fn) {
  const p = path.join(dir, file)
  const d = JSON.parse(readFileSync(p, 'utf8'))
  fn(d)
  writeFileSync(p, `${JSON.stringify(d, null, 2)}\n`)
  console.log('patched', file)
}

patch('burn.json', (d) => {
  for (const c of d.cards) {
    if (c.name === 'Goblin Guide') c.effect = { type: 'attack_guide' }
    if (c.name === 'Monastery Swiftspear') {
      c.keywords = ['Haste', 'Prowess']
      c.oracleText =
        'Haste\nProwess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)'
      c.oracleTextZh =
        '敏捷\n灵技（每当你施放非生物咒语时，此生物得+1/+1直到回合结束。）'
    }
    if (c.name === 'Fanatical Firebrand') {
      c.effect = { type: 'activate_sac_damage', amount: 1 }
    }
  }
})

patch('skies.json', (d) => {
  for (const c of d.cards) {
    if (c.name === 'Faerie Miscreant') {
      c.effect = { type: 'etb_miscreant_draw' }
      c.oracleText =
        'Flying\nWhen this creature enters, if you control another creature named Faerie Miscreant, draw a card.'
      c.oracleTextZh =
        '飞行\n当此生物进战场时，若你操控另一个名称为劣迹仙灵的生物，则抓一张牌。'
    }
    if (c.name === 'Spectral Sailor') {
      c.effect = { type: 'activate_draw', manaCost: '{3}{U}', amount: 1 }
    }
    if (c.name === 'Empyrean Eagle') {
      c.effect = { type: 'anthem_other_flyers', power: 1, toughness: 1 }
      c.oracleText = 'Flying\nOther creatures you control with flying get +1/+1.'
      c.oracleTextZh = '飞行\n由你操控的其他具飞行异能的生物得+1/+1。'
    }
    if (c.name === 'Opt') c.effect = { type: 'scry_draw', scry: 1, draw: 1 }
  }
})

patch('terror.json', (d) => {
  for (const c of d.cards) {
    if (c.name === 'Deep Analysis') {
      c.flashback = { manaCost: '{1}{U}', payLife: 3 }
    }
    if (c.name === "Chainer's Edict") {
      c.flashback = { manaCost: '{5}{B}{B}' }
    }
    if (c.name === 'Crawl from the Cellar') {
      c.flashback = { manaCost: '{B}' }
    }
  }
})
