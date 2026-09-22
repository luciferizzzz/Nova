import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { I18nProvider } from './i18n'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import AllNews from './pages/AllNews'
import ArticleDetail from './pages/ArticleDetail'
import Search from './pages/Search'
import Sources from './pages/Sources'
import Bookmarks from './pages/Bookmarks'
import Settings from './pages/Settings'
import About from './pages/About'
import Export from './pages/Export'
import Import from './pages/Import'
import Placeholder from './pages/Placeholder'
import Loading from './components/Loading'

function RequireAuth({ children }) {
  const { authed } = useAuth()
  if (authed === null) return <Loading text="Checking session…" />
  if (!authed) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/news" element={<AllNews />} />
              <Route path="/berita/:slug" element={<ArticleDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/map" element={<Placeholder />} />
              <Route path="/timeline" element={<Placeholder />} />
              <Route path="/analytics" element={<Placeholder />} />
              <Route path="/categories" element={<Placeholder />} />
              <Route path="/about" element={<About />} />
              <Route path="/tools/ai" element={<Placeholder />} />
              <Route path="/tools/searches" element={<Placeholder />} />
              <Route path="/tools/watchlist" element={<Placeholder />} />
              <Route path="/tools/export" element={<Export />} />
              <Route path="/tools/import" element={<Import />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </AuthProvider>
  )
}