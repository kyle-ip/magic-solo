import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LlmRichText } from '../LlmRichText'
import { createElement } from 'react'

describe('LlmRichText', () => {
  it('renders markdown headings and lists without raw markers', () => {
    const md = [
      '## 战况回顾',
      '- 开局不错',
      '- 中盘被 **迷乱怒视** 打断',
      '',
      '## 复盘',
      '1. 过早进攻',
      '2. 地不够',
      '',
      '## 改进建议',
      '多留 Fog。',
    ].join('\n')

    const html = renderToStaticMarkup(createElement(LlmRichText, { text: md }))

    expect(html).toContain('llm-md-h2')
    expect(html).toContain('战况回顾')
    expect(html).toContain('<ul')
    expect(html).toContain('<ol')
    expect(html).toContain('<strong>迷乱怒视</strong>')
    expect(html).not.toContain('## ')
    expect(html).not.toMatch(/>-\s/)
  })

  it('splits heading and following list without blank lines', () => {
    const html = renderToStaticMarkup(
      createElement(LlmRichText, {
        text: '## Advice\n- Mulligan more\n- Fix mana',
      }),
    )
    expect(html).toContain('llm-md-h2')
    expect(html).toContain('<ul')
    expect(html).toContain('Mulligan more')
    expect(html).not.toContain('## Advice')
  })
})
