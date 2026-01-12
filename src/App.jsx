import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './ui/hooks/useAuth'
import AuthGuard from './ui/components/AuthGuard'
import Login from './ui/pages/Login'
import Signup from './ui/pages/Signup'
import Dashboard from './ui/pages/Dashboard'
import Onboarding from './ui/pages/Onboarding'
import UploadTranscript from './ui/pages/UploadTranscript'
import GenerateContent from './ui/pages/GenerateContent'
import ContentLibrary from './ui/pages/ContentLibrary'
import AdminDashboard from './ui/pages/AdminDashboard'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding"
            element={
              <AuthGuard>
                <Onboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/upload"
            element={
              <AuthGuard>
                <UploadTranscript />
              </AuthGuard>
            }
          />
          <Route
            path="/generate/:sourceId"
            element={
              <AuthGuard>
                <GenerateContent />
              </AuthGuard>
            }
          />
          <Route
            path="/content/:sourceId"
            element={
              <AuthGuard>
                <ContentLibrary />
              </AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <AdminDashboard />
              </AuthGuard>
            }
          />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
