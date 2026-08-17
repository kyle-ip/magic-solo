---
name: mtg-ai-quality
description: >-
  Improves Magic Solo in-app LLM features using authoritative Magic: The Gathering
  sources (Wizards Comprehensive Rules, official ZH keyword glossary, Scryfall).
  Use when editing src/llm prompts, authority gloss, card assist, Scryfall NL search,
  Challenge coach/rules Q&A, terminology, or when the user asks to raise AI answer quality.
---

# Magic Solo — MTG AI quality

## Goal

Keep Magic Solo’s browser LLM answers grounded in **authoritative** sources—not fan wikis—while respecting this site’s **Challenge** simplifications.

## Authority order (must follow)

1. **Request payload** — card/rules/board JSON the app already sends  
2. **Magic Solo Challenge rules** — when those modes apply, they override full CR  
3. **Wizards of the Coast**
   - Rules hub: https://magic.wizards.com/en/rules  
   - Comprehensive Rules (current text downloads linked from that page)  
   - ZH keyword glossary: https://magic.wizards.com/zh-hans/keyword-glossary  
4. **Scryfall** (oracle + search; this site’s card pipeline)
   - Syntax: https://scryfall.com/docs/syntax  
   - API: https://scryfall.com/docs/api  
5. **Gatherer** only as secondary official card DB: https://gatherer.wizards.com/

**Do not** treat MTG Wiki, Reddit, or random blogs as authority when writing prompts or gloss.

## Code map

| Concern | Location |
| --- | --- |
| Shared grounding + evergreen gloss | `src/llm/authority.ts` |
| System prompts | `src/llm/prompts.ts` |
| Card assist + gloss injection | `src/components/CardLlmAssist.tsx` |
| ZH keyword labels | `src/data/locale/keywordsZh.ts` |
| Context builders | `src/llm/context/*` |

## When changing AI behavior

1. Prefer tightening **provided JSON** and **`authority.ts` gloss** over longer free-form system prompts.  
2. Every system prompt should keep `authorityGrounding()` (via `withAuthority` in `prompts.ts`).  
3. Card keyword / plain / ask / terms flows should append `officialGlossBlock(keywords, lang)` in the user message.  
4. Challenge coach / rules / setup / post-game prompts must pass `{ challengeMode: true }`.  
5. NL → Scryfall must only emit operators documented in Scryfall syntax docs.  
6. After editing gloss or prompts, bump or include relevant fields in LLM **cache payloads** so stale answers are not reused.  
7. For ZH terms, prefer the official glossary / printed Simplified Chinese:
   - Surveil = **刺探**
   - Investigate = **探查**
   - Explore = **勘察**
   - Cascade = **倾曳**
   - Keyword ability UI label = **关键字** (not 关键词)

## Refreshing the evergreen gloss

1. Download the latest Comprehensive Rules `.txt` from https://magic.wizards.com/en/rules  
2. Update `MTG_AUTHORITY.comprehensiveRulesTxt` in `authority.ts`  
3. Refresh only keywords you change; keep entries to **one short sentence** each (token budget)  
4. Cross-check ZH wording against https://magic.wizards.com/zh-hans/keyword-glossary  

## Out of scope

- Do not ship the full Comprehensive Rules PDF/TXT in the client bundle.  
- Do not invent Gatherer rulings in prompts.  
- Cursor Skills guide **agents** editing this repo; they are **not** injected into the end-user’s API calls unless encoded into `src/llm/*`.

## Extra reference

See [sources.md](sources.md) for the canonical URL list.
