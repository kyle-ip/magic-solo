# Authoritative sources for Magic Solo AI

Last reviewed with CR text dated **2026-08-07** (Wizards download) and the live ZH keyword glossary.

## Primary

| Source | URL | Use for |
| --- | --- | --- |
| Magic Rules hub | https://magic.wizards.com/en/rules | Finding current Comprehensive Rules downloads |
| Comprehensive Rules (example dated file) | https://media.wizards.com/2026/downloads/MagicCompRules%2020260807.txt | Evergreen keyword / action definitions |
| 万智牌常见关键字 | https://magic.wizards.com/zh-hans/keyword-glossary | Official Simplified Chinese evergreen wording |
| Scryfall syntax | https://scryfall.com/docs/syntax | NL → search query generation |
| Scryfall API | https://scryfall.com/docs/api | Card oracle fields this site already caches |

## Secondary (official, use sparingly)

| Source | URL | Notes |
| --- | --- | --- |
| Gatherer | https://gatherer.wizards.com/ | Official card DB; Scryfall is preferred in this codebase |
| How to play (ZH) | https://magic.wizards.com/zh-hans/how-to-play | Casual onboarding language only |

## Site-local (highest priority inside Challenge flows)

- Challenge Deck rules JSON shipped with Magic Solo  
- Challenge Experience simplifications called out on cards / rules panels  

When Experience omits an ability, the LLM must follow the **site text**, not invent the full CR behavior.

## Explicitly non-authoritative for prompts

- Fan wikis (including MTG Wiki) as sole citation  
- Unofficial WeChat articles / unverified glossary mirrors  
- Model “memory” of tournament rulings without payload support  
