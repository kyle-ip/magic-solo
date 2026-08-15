import { lazy, Suspense, useLayoutEffect, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { FloatingNav } from './components/FloatingNav'
import { LlmSettingsHost } from './components/LlmSettingsHost'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { HomePage } from './pages/HomePage'
import {
  getHideSiteChrome,
  subscribeHideSiteChrome,
} from './utils/siteChrome'

const DeckPage = lazy(() =>
  import('./pages/DeckPage').then((m) => ({ default: m.DeckPage })),
)
const ClassicDecksPage = lazy(() =>
  import('./pages/ClassicDecksPage').then((m) => ({
    default: m.ClassicDecksPage,
  })),
)
const ClassicDeckDetailPage = lazy(() =>
  import('./pages/ClassicDeckDetailPage').then((m) => ({
    default: m.ClassicDeckDetailPage,
  })),
)
const SetsPage = lazy(() =>
  import('./pages/SetsPage').then((m) => ({ default: m.SetsPage })),
)
const SetGalleryPage = lazy(() =>
  import('./pages/SetGalleryPage').then((m) => ({
    default: m.SetGalleryPage,
  })),
)
const ChallengePage = lazy(() =>
  import('./pages/ChallengePage').then((m) => ({ default: m.ChallengePage })),
)
const AssistantPage = lazy(() =>
  import('./pages/AssistantPage').then((m) => ({ default: m.AssistantPage })),
)
const HelpPage = lazy(() =>
  import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })),
)

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
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/decks/:setCode" element={<DeckPage />} />
          <Route path="/classic-decks" element={<ClassicDecksPage />} />
          <Route path="/classic-decks/:id" element={<ClassicDeckDetailPage />} />
          <Route path="/sets" element={<SetsPage />} />
          <Route path="/sets/:code" element={<SetGalleryPage />} />
          <Route path="/experience/decks/:setCode" element={<LegacyModeDeckRedirect />} />
          <Route path="/assistant/decks/:setCode" element={<LegacyModeDeckRedirect />} />
          <Route path="/challenge/:setCode" element={<ChallengePage />} />
          <Route path="/assistant/:setCode" element={<AssistantPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!hideChrome ? <SiteFooter /> : null}
      <FloatingNav arenaMode={hideChrome} />
      <LlmSettingsHost />
    </div>
  )
}
