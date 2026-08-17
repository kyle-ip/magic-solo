import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const dir = path.join('src', 'data', 'cards', 'player')

function patch(file, fn) {
  const p = path.join(dir, file)
  const j = JSON.parse(readFileSync(p, 'utf8'))
  fn(j)
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`)
  console.log('patched', file)
}

patch('merfolk.json', (j) => {
  for (const c of j.cards) {
    if (c.name === 'Merfolk Trickster') {
      c.effect = { type: 'etb_tap_opp' }
      c.oracleText =
        'Flash\nWhen this creature enters, tap target creature an opponent controls. It loses all abilities until end of turn.'
      c.oracleTextZh =
        '闪现\n当此生物进战场时，横置目标由对手操控的生物。它失去所有异能直到回合结束。'
    }
    if (c.name === 'Silvergill Adept') {
      c.effect = { type: 'silvergill_draw' }
      c.oracleText =
        'As an additional cost to cast this spell, reveal a Merfolk card from your hand or pay {3}.\nWhen this creature enters, draw a card.'
      c.oracleTextZh =
        '从你的手上展示一张人鱼牌或支付{3}，以作为施放此咒语的额外费用。\n当此生物进战场时，抓一张牌。'
    }
    if (c.name === 'Unsummon') {
      c.effect = { type: 'bounce_creature' }
      c.oracleText =
        "Return target creature to its owner's hand.\n(Challenge: returned to the top of the challenge library.)"
      c.oracleTextZh = '将目标生物移回其拥有者手上。\n（挑战：置于挑战牌库顶。）'
    }
    if (c.name === 'Into the Roil') {
      c.effect = {
        type: 'bounce_creature',
        kicker: { manaCost: '{1}{U}', draw: 1 },
      }
      c.oracleText =
        "Kicker {1}{U}\nReturn target nonland permanent to its owner's hand. If this spell was kicked, draw a card.\n(Challenge: bounce to library top; auto-kick when affordable.)"
      c.oracleTextZh =
        '增幅{1}{U}\n将目标非地永久物移回其拥有者手上。若已增幅，则抓一张牌。\n（挑战：弹回牌库顶；能支付时自动增幅。）'
    }
  }
})

patch('akroan.json', (j) => {
  for (const c of j.cards) {
    if (c.name === 'Wingsteed Rider') {
      c.effect = { type: 'heroic_self' }
      c.oracleText =
        'Flying\nHeroic — Whenever you cast a spell that targets this creature, put a +1/+1 counter on this creature.'
      c.oracleTextZh =
        '飞行\n勇行～每当你施放以它为目标的咒语时，在其上放置一个+1/+1指示物。'
    }
    if (c.name === 'Observant Alseid') {
      c.effect = {
        type: 'bestow',
        manaCost: '{4}{W}',
        power: 2,
        toughness: 2,
        keywords: ['Vigilance'],
      }
      c.oracleText =
        'Bestow {4}{W}\nVigilance\nEnchanted creature gets +2/+2 and has vigilance.'
      c.oracleTextZh = '神授{4}{W}\n警戒\n所结附的生物得+2/+2且具有警戒。'
    }
    if (c.name === 'Anax and Cymede') {
      c.effect = {
        type: 'heroic_team',
        power: 1,
        toughness: 1,
        grantTrample: true,
      }
      c.oracleText =
        'First strike, vigilance\nHeroic — Whenever you cast a spell that targets Anax and Cymede, creatures you control get +1/+1 and gain trample until end of turn.'
      c.oracleTextZh =
        '先攻，警戒\n勇行～每当你施放以它为目标的咒语时，由你操控的生物得+1/+1且获得践踏直到回合结束。'
    }
    if (c.name === 'Celestial Archon') {
      c.effect = {
        type: 'bestow',
        manaCost: '{5}{W}{W}',
        power: 4,
        toughness: 4,
        keywords: ['Flying', 'First strike'],
      }
      c.oracleText =
        'Bestow {5}{W}{W}\nFlying, first strike\nEnchanted creature gets +4/+4 and has flying and first strike.'
      c.oracleTextZh =
        '神授{5}{W}{W}\n飞行，先攻\n所结附的生物得+4/+4且具有飞行与先攻。'
    }
  }
})

patch('nessian.json', (j) => {
  for (const c of j.cards) {
    if (c.name === 'Leafcrown Dryad') {
      c.effect = {
        type: 'bestow',
        manaCost: '{3}{G}',
        power: 2,
        toughness: 2,
        keywords: ['Reach'],
      }
      c.oracleText =
        'Bestow {3}{G}\nReach\nEnchanted creature gets +2/+2 and has reach.'
      c.oracleTextZh = '神授{3}{G}\n延势\n所结附的生物得+2/+2且具有延势。'
    }
    if (c.name === 'Slaughterhorn') {
      c.effect = { type: 'bloodrush', manaCost: '{G}', power: 3, toughness: 2 }
      c.keywords = ['Trample']
      c.oracleText =
        'Trample\nBloodrush — {G}, Discard this card: Target attacking creature gets +3/+2 until end of turn.'
      c.oracleTextZh =
        '践踏\n血激～{G}，弃掉此牌：目标攻击中的生物得+3/+2直到回合结束。'
    }
    if (c.name === 'Arbor Colossus' && c.effect?.type === 'activate_monstrosity') {
      c.effect.thenDestroyFlyer = true
      c.oracleText = (c.oracleText || '').replace(/\n\(Challenge:.*$/s, '')
      c.oracleTextZh = (c.oracleTextZh || '').replace(/\n（挑战：.*$/s, '')
    }
  }
})

patch('humans.json', (j) => {
  for (const c of j.cards) {
    if (c.name === "Thalia's Lieutenant") {
      c.effect = { type: 'human_lieutenant', power: 1, toughness: 1 }
      c.oracleText =
        'When this creature enters, put a +1/+1 counter on each other Human you control.\nOther Human creatures you control get +1/+1.\nWhenever another Human you control enters, put a +1/+1 counter on this creature.'
      c.oracleTextZh =
        '当此生物进战场时，在每个由你操控的其他人类上各放置一个+1/+1指示物。\n由你操控的其他人类生物得+1/+1。\n每当另一个由你操控的人类进场时，在此生物上放置一个+1/+1指示物。'
    }
    if (c.name === 'Benalish Marshal') {
      c.effect = { type: 'anthem_other_creatures', power: 1, toughness: 1 }
      c.oracleText = 'Other creatures you control get +1/+1.'
      c.oracleTextZh = '由你操控的其他生物得+1/+1。'
    }
  }
})

patch('spirits.json', (j) => {
  for (const c of j.cards) {
    if (c.name === 'Mausoleum Wanderer') {
      c.effect = { type: 'spirit_etb_pump' }
      c.oracleText =
        'Flying\nWhenever another Spirit you control enters, this creature gets +1/+1 until end of turn.\n(Challenge: counter ability omitted — no stack.)'
      c.oracleTextZh =
        '飞行\n每当另一个由你操控的精怪进场时，此生物得+1/+1直到回合结束。\n（挑战：省略反击异能——无堆叠。）'
    }
    if (c.name === 'Rattlechains') {
      c.effect = { type: 'spirits_have_flash' }
      c.oracleText =
        'Flash\nFlying\nYou may cast Spirit spells as though they had flash.\n(Challenge: ETB hexproof grant omitted.)'
      c.oracleTextZh =
        '闪现\n飞行\n你可以将精怪咒语视同具有闪现来施放。\n（挑战：省略进场赋予辟邪。）'
    }
    if (c.name === 'Remorseful Cleric') {
      c.effect = { type: 'activate_sac_exile_gy' }
      c.oracleText =
        "Flying\nSacrifice this creature: Exile target player's graveyard."
      c.oracleTextZh = '飞行\n牺牲此生物：放逐目标牌手的坟墓场。'
    }
    if (c.name === 'Unsummon') {
      c.effect = { type: 'bounce_creature' }
      c.oracleText =
        "Return target creature to its owner's hand.\n(Challenge: returned to the top of the challenge library.)"
      c.oracleTextZh = '将目标生物移回其拥有者手上。\n（挑战：置于挑战牌库顶。）'
    }
  }
})

patch('wildfire.json', (j) => {
  for (const c of j.cards) {
    if (c.name === 'Polukranos, World Eater' && c.effect?.type === 'activate_monstrosity') {
      c.effect.thenFight = true
    }
  }
})

console.log('done')
