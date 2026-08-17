import { useMemo, type MouseEvent } from 'react'
import { marked } from 'marked'
import { useTranslation } from 'react-i18next'
import guideEn from '../../docs/USER_GUIDE.en.md?raw'
import guideZh from '../../docs/USER_GUIDE.zh.md?raw'
import { PageSection } from '../components/ui'

const README_URL =
  'https://github.com/kyle-ip/magic-solo/blob/main/README.md'

function githubSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M} -]/gu, '')
    .replace(/ /g, '-')
}

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      const plain = tokens
        .map((t) => ('text' in t && typeof t.text === 'string' ? t.text : ''))
        .join('')
      const id = githubSlug(plain || text.replace(/<[^>]+>/g, ''))
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      let url = href || ''
      if (url.endsWith('USER_GUIDE.zh.md')) url = '#lang-zh'
      else if (url.endsWith('USER_GUIDE.en.md')) url = '#lang-en'
      else if (url === '../README.md' || url.endsWith('/README.md'))
        url = README_URL
      const titleAttr = title ? ` title="${title}"` : ''
      const external =
        /^https?:\/\//i.test(url) ?
          ' target="_blank" rel="noreferrer"'
        : ''
      return `<a href="${url}"${titleAttr}${external}>${text}</a>`
    },
  },
})

export function HelpPage() {
  const { i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')
  const html = useMemo(() => {
    const raw = isZh ? guideZh : guideEn
    return marked.parse(raw, { async: false }) as string
  }, [isZh])

  const onClick = (e: MouseEvent<HTMLElement>) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (href === '#lang-zh') {
      e.preventDefault()
      void i18n.changeLanguage('zh')
      return
    }
    if (href === '#lang-en') {
      e.preventDefault()
      void i18n.changeLanguage('en')
    }
  }

  return (
    <main className="page help-page">
      <PageSection className="help-page-section">
        <article
          className="help-article"
          onClick={onClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </PageSection>
    </main>
  )
}
