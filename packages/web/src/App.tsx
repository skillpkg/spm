import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Layout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/home';
import { Search } from './pages/Search';
import { SkillDetail } from './pages/skill-detail';
import { AuthorProfile } from './pages/AuthorProfile';
import { Dashboard } from './pages/dashboard';
import { SignIn } from './pages/SignIn';
import { Docs } from './pages/Docs';
import { DocDetail } from './pages/DocDetail';
import { CLI } from './pages/CLI';
import { Publish } from './pages/Publish';
import { Privacy } from './pages/Privacy';

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/skills/*" element={<SkillDetail />} />
              <Route path="/authors/:username" element={<AuthorProfile />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:slug" element={<DocDetail />} />
              <Route path="/cli" element={<CLI />} />
              <Route path="/publish" element={<Publish />} />
              <Route path="/privacy" element={<Privacy />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
