import { useLayoutEffect, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { FloatingNav } from './components/FloatingNav'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { AssistantPage } from './pages/AssistantPage'
import { ChallengePage } from './pages/ChallengePage'
import { DeckPage } from './pages/DeckPage'
import { HomePage } from './pages/HomePage'
import {
  getHideSiteChrome,
  subscribeHideSiteChrome,
} from './utils/siteChrome'

function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const html = document.documentElement
    const previous = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    html.scrollTop = 0
    document.body.scrollTop = 0
    html.style.scrollBehavior = previous
  }, [pathname])
  return null
}

function LegacyModeDeckRedirect() {
  const { setCode = '' } = useParams()
  return <Navigate to={`/decks/${setCode}`} replace />
}

export default function App() {
  const { pathname } = useLocation()
  const hideChromePlaying = useSyncExternalStore(
    subscribeHideSiteChrome,
    getHideSiteChrome,
    () => false,
  )
  // Assistant board stays chrome-free; challenge setup keeps SiteHeader,
  // and ChallengePage toggles hide while actively playing.
  const hideChromeRoute =
    pathname.startsWith('/assistant/') &&
    !pathname.startsWith('/assistant/decks/')
  const hideChrome = hideChromeRoute || hideChromePlaying
  const isArena = hideChrome

  return (
    <div className={`app-shell ${isArena ? 'is-arena' : ''}`}>
      <ScrollToTop />
      {!hideChrome ? <SiteHeader /> : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decks/:setCode" element={<DeckPage />} />
        <Route path="/experience/decks/:setCode" element={<LegacyModeDeckRedirect />} />
        <Route path="/assistant/decks/:setCode" element={<LegacyModeDeckRedirect />} />
        <Route path="/challenge/:setCode" element={<ChallengePage />} />
        <Route path="/assistant/:setCode" element={<AssistantPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideChrome ? <SiteFooter /> : null}
      {!hideChrome ? <FloatingNav /> : null}
    </div>
  )
}
