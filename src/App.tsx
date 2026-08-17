import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { lazy, Suspense, useLayoutEffect, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { FloatingNav } from './components/FloatingNav'
import { LlmSettingsHost } from './components/LlmSettingsHost'
import { PageChatHost } from './components/PageChatHost'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { HomePage } from './pages/HomePage'
import { CARD_EDITOR_ENABLED } from './features'
import {
  getHideSiteChrome,
  subscribeHideSiteChrome,
} from './utils/siteChrome'
import './styles/cursors.css'

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
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const CardEditorPage = lazy(() =>
  import('./pages/CardEditorPage').then((m) => ({
    default: m.CardEditorPage,
  })),
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

function AnimatedRoutes({ isArena }: { isArena: boolean }) {
  const location = useLocation()
  const reduce = useReducedMotion()
  const skipMotion = isArena || reduce

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="page-enter app-route-layer"
        initial={skipMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={skipMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{
          duration: skipMotion ? 0 : 0.28,
          ease: [0.22, 0.61, 0.36, 1],
        }}
        style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Suspense fallback={null}>
          <Routes location={location}>
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
            <Route
              path="/editor"
              element={
                CARD_EDITOR_ENABLED ? <CardEditorPage /> : <NotFoundPage />
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const hideChromePlaying = useSyncExternalStore(
    subscribeHideSiteChrome,
    getHideSiteChrome,
    () => false,
  )
  const hideChrome = hideChromePlaying
  const isArena = hideChrome

  return (
    <div className={`app-shell ${isArena ? 'is-arena' : ''}`}>
      <ScrollToTop />
      {!hideChrome ? <SiteHeader /> : null}
      <AnimatedRoutes isArena={isArena} />
      {!hideChrome ? <SiteFooter /> : null}
      <FloatingNav arenaMode={hideChrome} />
      <LlmSettingsHost />
      <PageChatHost />
    </div>
  )
}
