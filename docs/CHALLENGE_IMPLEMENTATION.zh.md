# 数字对战与玩家牌组 — 实现情况

> 维护用快照（2026-08）。面向站内 **十套玩家构筑** vs **三套挑战套牌** 的数字对战（`/challenge/:setCode`）。  
> 用户向说明见 [用户指南 · 挑战](./USER_GUIDE.zh.md#3-挑战)。  
> English: [CHALLENGE_IMPLEMENTATION.en.md](./CHALLENGE_IMPLEMENTATION.en.md)

## 产品边界

| 目标 | 非目标 |
| --- | --- |
| 对齐官方挑战套牌流程（Hydra / Horde / God） | 完整 Comprehensive Rules / Arena 对手 |
| 站内精选 60 张构筑列表可玩、异能尽量贴印刷 | 任意经典构筑一键导入对战 |
| 无 AI key 也能完整对战 | 真实堆叠、优先权、层叠 |

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

三套挑战共用上述列表。牌表预览中带 **简化** 徽章的牌，印刷文本在引擎中有近似或省略（见牌面「挑战：…」注记）。

重建列表：`node scripts/build-player-deck.mjs <id>`

---

## 引擎能力（已实现）

### 常青与战斗

- 敏捷、闪现、警戒、系命、灵技、死触、延势 / 飞行阻挡  
- **先攻 / 连击**：独立战斗伤害步骤（非力量 ×2）  
- **践踏**（玩家侧）：超额伤害 — Hydra → 另一头；God → Xenagos；Horde → 继续磨牌  
- 颂歌：飞行、种族、其他生物  

### 施放与互动

- 地、法力池、自动横置支付、法术仅主阶段等简化时序  
- 直伤任意目标、浓雾、互斗、泵、消灭、弹回（挑战生物 → 挑战牌库顶）  
- 磨牌 / 抽牌、占卜、头脑风暴、返照、掘穴折减、恐怖折减  
- 教令式牺牲、尖牙、爬窖、法拉吉磨牌搜刮（无非生物非地则 +1/+1）  

### Theros / 构筑关键字

- **神授**：结附 + 宿主死亡后落地成生物；神授目标触发 **勇行**  
- **勇行** / **血激** / **营队** / **教区指示物** / **人类中尉**  
- **庞大化**（双击支付；可接摧毁飞行 / 互斗）  
- **留存**（帮厨奥夫）  
- **腐食流浆**：`{G}` 启动放逐坟墓（优先挑战坟）  
- **涡心鼓动**：同名挑战生物清场  
- 精怪进场泵、精怪视同闪现、银鳃额外费用、人鱼领主身材等  

### 挑战半场

| 挑战 | 状态概要 |
| --- | --- |
| Face the Hydra (`tfth`) | 头颅、吐息、Hide、Hero's Reward、Swallow、精英触发等已接线 |
| Battle the Horde (`tbth`) | 延迟苏醒、磨牌、部落施放；战斗相对简化 |
| Defeat a God (`tdag`) | Xenagos / 狂欢者、阻挡与践踏规则；冲动毁灭等按构筑列表适配 |

测试：`src/game/__tests__/rulesFidelity.test.ts`、`playerAbilities.test.ts`

---

## 各牌组覆盖与诚实简化

图例：**齐** ≈ 列表核心异能已接线；**简** = 仍有印刷近似（牌面注明）。

| 牌组 | 覆盖 | 仍简化的典型项 |
| --- | --- | --- |
| 野火军团 | 齐 | 庞大化费用固定；余烬吞食者牺牲地 / 暴喘龙反白等省略 |
| 蓝黑惧兽 | 齐 | —（模型限制：弹回无「手牌」） |
| 焦炎齐射 | 齐 | 向导亮地 → 牌库底（非手牌）；部分直伤目标宽松 |
| 苍穹飞攻 | 齐+简 | Journey / Banishing ≈ 消灭；无「离开再回来」 |
| 珍珠三叉戟 | 齐+简 | 海岛行省略；Trickster 失能近似；弹回 → 牌库顶 |
| 阿喀洛斯军团 | 齐 | 神授 / 勇行已接；Journey 类仍为消灭近似 |
| 涅西恩荒野 | 齐 | — |
| 教区人海 | 齐+简 | 线索 ≈ 进场抓牌；防多色省略 |
| 幽影合唱 | 齐+简 | 无堆叠反击；Rattlechains 进场辟邪省略 |
| 血辫荒原 | 齐+简 | 倾曳 ≈ 进场抓 1；古夫为粘性 +2/+2 近似 CDA |

---

## 刻意不做（需完整 CR）

- 真实堆叠、优先权、软反击窗口  
- 完整层叠 / 特征定义力量（古夫按坟墓类别实时计数）  
- 完整倾曳（放逐施放顺序）  
- 线索衍生物经济、真实保护 / 辟邪预防层  
- 经典构筑页（`/classic-decks`）牌表直接开战  

---

## 关键代码索引

| 区域 | 路径 |
| --- | --- |
| 牌组注册 / `PlayerEffect` | `src/game/playerDecks.ts` |
| 施放与启动 | `src/game/playerCast.ts` |
| 颂歌 / 阻挡 / 启动判定 | `src/game/playerAbilities.ts` |
| 神授 / 勇行辅助 | `src/game/playerExtras.ts` |
| 死亡结算（神授落地、留存） | `src/game/helpers.ts` → `buryPlayerCreatures` |
| 玩家战斗 | `src/game/combat.ts` |
| 简化徽章检测 | `src/game/simplifiedOracle.ts` |

---

## 更新约定

站内玩家列表或数字对战规则有用户可见变化时：

1. 更新本文件与英文对照版  
2. 同步 [USER_GUIDE.zh.md](./USER_GUIDE.zh.md) / [USER_GUIDE.en.md](./USER_GUIDE.en.md) 相关段落  
3. 必要时更新 README 功能摘要与 `src/data/cards/README.md`
