import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { FloatingNav } from './components/FloatingNav'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { AssistantPage } from './pages/AssistantPage'
import { ChallengePage } from './pages/ChallengePage'
import { DeckPage } from './pages/DeckPage'
import { HomePage } from './pages/HomePage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function LegacyModeDeckRedirect() {
  const { setCode = '' } = useParams()
  return <Navigate to={`/decks/${setCode}`} replace />
}

export default function App() {
  const { pathname } = useLocation()
  const isArena =
    pathname.startsWith('/challenge/') ||
    (pathname.startsWith('/assistant/') && !pathname.startsWith('/assistant/decks/'))

  return (
    <div className={`app-shell ${isArena ? 'is-arena' : ''}`}>
      <ScrollToTop />
      {!isArena ? <SiteHeader /> : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decks/:setCode" element={<DeckPage />} />
        <Route path="/experience/decks/:setCode" element={<LegacyModeDeckRedirect />} />
        <Route path="/assistant/decks/:setCode" element={<LegacyModeDeckRedirect />} />
        <Route path="/challenge/:setCode" element={<ChallengePage />} />
        <Route path="/assistant/:setCode" element={<AssistantPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isArena ? <SiteFooter /> : null}
      {!isArena ? <FloatingNav /> : null}
    </div>
  )
}
