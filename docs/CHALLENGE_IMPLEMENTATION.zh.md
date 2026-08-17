# 数字对战与玩家牌组 — 实现情况

> 维护用快照（2026-08）。面向站内 **十套玩家构筑** vs **三套挑战套牌** 的数字对战（`/challenge/:setCode`）。  
> 用户向说明见 [用户指南 · 挑战](./USER_GUIDE.zh.md#3-挑战)。  
> English: [CHALLENGE_IMPLEMENTATION.en.md](./CHALLENGE_IMPLEMENTATION.en.md)

## 产品边界

| 目标 | 非目标 |
| --- | --- |
| 对齐官方挑战套牌流程（Hydra / Horde / God），机制尽量贴印刷 | 完整 Arena / 任意构筑导入 |
| 站内精选 60 张列表可玩；含鹏洛客、结界、线索、有限堆叠 | 完整指挥官、默认多人同时挑战 |
| 无 AI key 也能完整对战 | 全系列 oracle 解释器、完整层叠 1–7 |

牌表数据：`src/data/cards/player/*.json` · 引擎：`src/game/` · 挑战半场：`hydra.ts` / `horde.ts` / `god.ts`

---

## 玩家牌组一览

| Id | 英文名 | 中文名 | 色 / 角色 | 数据文件 |
| --- | --- | --- | --- | --- |
| `wildfire` | Wildfire Host | 野火军团 | RG 中速 | `player/wildfire.json` |
| `terror` | UB Terror | 蓝黑惧兽 | UB 节奏 | `player/terror.json` |
| `burn` | Ember Barrage | 焦炎齐射 | R 快攻 / 直伤 | `player/burn.json` |
| `skies` | Azure Skies | 苍穹飞攻 | WU 飞行 | `player/skies.json` |
| `merfolk` | Pearl Trident | 珍珠三叉戟 | U 人鱼 | `player/merfolk.json` |
| `akroan` | Akroan Legion | 阿喀洛斯军团 | WR 士兵 | `player/akroan.json` |
| `nessian` | Nessian Wilds | 涅西恩荒野 | G 野兽 | `player/nessian.json` |
| `humans` | Parish Host | 教区人海 | W 人类 | `player/humans.json` |
| `spirits` | Spectral Chorus | 幽影合唱 | WU 精怪 | `player/spirits.json` |
| `jund` | Bloodbraid Barrens | 血辫荒原 | BRG 中速 | `player/jund.json` |

部分列表均混入精选鹏洛客（十套各至少 1 张）。牌表预览中带 **简化** 徽章的牌仍有诚实注记。

重建列表：`node scripts/build-player-deck.mjs <id>`

---

## 引擎能力（已实现）

### 回合与清理

- 开局 **再调度**（伦敦规则）；结束回合手牌 **弃至 7**
- 玩家阶段仍以主阶段 / 战斗 / 结束呈现；内部含先攻与普通伤害步骤

### 有限堆叠

- 挑战揭示的咒语先入堆叠，玩家获得优先权：**让过** / **陵墓游灵反击** / **施放浓雾**（仅「让过」时自动结算，不弹窗）
- 非完整优先权传递；挑战侧默认让过

### 常青与战斗

- 敏捷、闪现、警戒、系命、灵技、死触、延势 / 飞行阻挡、海岛行（关键字；挑战无 Island 则不触发）
- **先攻 / 连击** 分步伤害；**践踏** 溢出；Horde 战斗对齐先攻/死触步骤
- 防多色关键字、辟邪（临时，如缀链灵）

### 永久物

- 地 / 生物 / 瞬间 / 法术 / **结界** / **神器（线索）** / **鹏洛客**
- Journey / Banishing：**链接放逐**（结界离开时返回）
- 线索：`{2}`，牺牲，抓牌
- 鹏洛客：进场忠诚、每回合一次忠诚异能、伤害扣忠诚、≤0 进坟
- **传奇规则** SBA；**古夫** 坟场牌类 CDA；**倾曳** 放逐后免费施放

### Theros / 构筑关键字

- 神授、勇行、血激、营队、教区/中尉、庞大化（含 X 与多目标互斗）、留存、腐食流浆、涡心鼓动等

### 挑战半场

| 挑战 | 状态概要 |
| --- | --- |
| Face the Hydra (`tfth`) | 头颅、吐息、Hide、Hero's Reward、Swallow、精英触发等 |
| Battle the Horde (`tbth`) | 延迟苏醒、磨牌；战斗含先攻/死触步骤 |
| Defeat a God (`tdag`) | Xenagos / 狂欢者、阻挡与践踏 |

测试：`src/game/__tests__/`（rulesFidelity、playerAbilities、mulliganDiscard、enchantmentsClue、planeswalkers、cascadeStack）

---

## 各牌组覆盖与诚实简化

图例：**齐** ≈ 核心已接线；**简** = 仍有印刷近似。

| 牌组 | 覆盖 | 仍简化的典型项 |
| --- | --- | --- |
| 野火军团 | 齐 | 余烬吞食者牺牲地 / 暴喘龙反白等；Polukranos 自动取最大 X |
| 蓝黑惧兽 | 齐 | 弹回 → 挑战牌库顶（无挑战手牌） |
| 焦炎齐射 | 齐 | 向导亮地 → 牌库底（无挑战手牌） |
| 苍穹飞攻 | 齐 | — |
| 珍珠三叉戟 | 齐 | 弹回 → 牌库顶；Trickster 失能近似 |
| 阿喀洛斯军团 | 齐 | — |
| 涅西恩荒野 | 齐 | — |
| 教区人海 | 齐 | 多色施放获命触发仍弱 |
| 幽影合唱 | 齐 | 反击仅挑战揭示窗口 |
| 血辫荒原 | 齐 | — |

---

## 刻意不做

- 任意 `/classic-decks` 导入数字对战  
- 完整指挥官、默认多人同时挑战  
- 完整层叠 1–7、通用 Counterspell 生态、全自动 oracle  
- 破坏性 UI / 布局重做  

---

## 关键代码索引

| 区域 | 路径 |
| --- | --- |
| 牌组 / `PlayerEffect` | `src/game/playerDecks.ts` |
| 施放与启动 | `src/game/playerCast.ts` |
| 有限堆叠 | `src/game/stack.ts` |
| 倾曳 / 古夫 / 传奇 | `src/game/cascadeGoyf.ts` |
| Horde 战斗 | `src/game/horde.ts` |
| 简化徽章 | `src/game/simplifiedOracle.ts` |

---

## 更新约定

站内玩家列表或数字对战规则有用户可见变化时：

1. 更新本文件与英文对照版  
2. 同步 [USER_GUIDE.zh.md](./USER_GUIDE.zh.md) / [USER_GUIDE.en.md](./USER_GUIDE.en.md)  
3. 必要时更新 README 与 `src/data/cards/README.md`
