import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearBattleHistory,
  deleteBattleHistory,
  listBattleHistory,
  upsertBattleHistory,
  patchBattleHistory,
} from '../battleHistory'

describe('battleHistory storage', () => {
  beforeEach(() => {
    clearBattleHistory()
  })

  it('saves and lists by challenge code', () => {
    upsertBattleHistory({
      id: 'a',
      code: 'tbth',
      status: 'won',
      resultKey: 'hordeCleared',
      playerDeckId: 'burn',
      playerDeckName: 'Challenge Burn',
      playerDeckNameZh: '挑战燃烧',
      turnNumber: 5,
      life: 12,
      creaturesAlive: 1,
      fallen: 3,
      enemyLibrary: 0,
      enemyBoard: 0,
      battleReport: '## Recap\n- Good',
      lang: 'en',
    })
    upsertBattleHistory({
      id: 'b',
      code: 'tfth',
      status: 'lost',
      resultKey: null,
      playerDeckId: 'wildfire',
      playerDeckName: 'Wildfire Host',
      playerDeckNameZh: '野火大军',
      turnNumber: 8,
      life: 0,
      creaturesAlive: 0,
      fallen: 4,
      enemyLibrary: 40,
      enemyBoard: 2,
      lang: 'zh',
    })

    expect(listBattleHistory('tbth')).toHaveLength(1)
    expect(listBattleHistory('tbth')[0].id).toBe('a')
    expect(listBattleHistory()).toHaveLength(2)
  })

  it('patches report without wiping post-asks', () => {
    upsertBattleHistory({
      id: 'c',
      code: 'tdag',
      status: 'won',
      resultKey: 'godFallen',
      playerDeckId: 'skies',
      playerDeckName: 'Azure Skies',
      playerDeckNameZh: '苍穹飞攻',
      turnNumber: 6,
      life: 10,
      creaturesAlive: 2,
      fallen: 1,
      enemyLibrary: 20,
      enemyBoard: 0,
      lang: 'en',
    })
    patchBattleHistory('c', {
      postAsks: [{ question: 'Why?', answer: 'Because.' }],
    })
    upsertBattleHistory({
      id: 'c',
      code: 'tdag',
      status: 'won',
      resultKey: 'godFallen',
      playerDeckId: 'skies',
      playerDeckName: 'Azure Skies',
      playerDeckNameZh: '苍穹飞攻',
      turnNumber: 6,
      life: 10,
      creaturesAlive: 2,
      fallen: 1,
      enemyLibrary: 20,
      enemyBoard: 0,
      battleReport: '## Advice\n- Flyers',
      lang: 'en',
    })
    const row = listBattleHistory('tdag')[0]
    expect(row.battleReport).toContain('Advice')
    expect(row.postAsks).toHaveLength(1)
    deleteBattleHistory('c')
    expect(listBattleHistory('tdag')).toHaveLength(0)
  })
})
