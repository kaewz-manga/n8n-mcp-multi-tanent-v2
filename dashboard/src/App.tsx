import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import Usage from './pages/Usage';
import Settings from './pages/Settings';
import AdminRoute from './components/AdminRoute';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminHealth from './pages/admin/AdminHealth';
import AdminFeedback from './pages/admin/AdminFeedback';
import WorkflowList from './pages/n8n/WorkflowList';
import ExecutionList from './pages/n8n/ExecutionList';
import CredentialList from './pages/n8n/CredentialList';
import TagList from './pages/n8n/TagList';
import N8nUserList from './pages/n8n/N8nUserList';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import FAQ from './pages/FAQ';
import Documentation from './pages/Documentation';
import Status from './pages/Status';
import AccountDeleted from './pages/AccountDeleted';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { SudoProvider } from './contexts/SudoContext';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Public Route wrapper (redirect to dashboard if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Smart Route wrapper (shows Layout if logged in, standalone if not)
function SmartRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  if (user) {
    return <Layout>{children}</Layout>;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/account-deleted" element={<AccountDeleted />} />

      {/* Info pages - with Layout if logged in, standalone if not */}
      <Route path="/terms" element={<SmartRoute><Terms /></SmartRoute>} />
      <Route path="/privacy" element={<SmartRoute><Privacy /></SmartRoute>} />
      <Route path="/faq" element={<SmartRoute><FAQ /></SmartRoute>} />
      <Route path="/docs" element={<SmartRoute><Documentation /></SmartRoute>} />
      <Route path="/status" element={<SmartRoute><Status /></SmartRoute>} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connections"
        element={
          <ProtectedRoute>
            <Connections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usage"
        element={
          <ProtectedRoute>
            <Usage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
      <Route path="/admin/revenue" element={<AdminRoute><AdminRevenue /></AdminRoute>} />
      <Route path="/admin/health" element={<AdminRoute><AdminHealth /></AdminRoute>} />
      <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />

      {/* n8n Management routes - 6 pages, all operations per resource */}
      <Route path="/n8n/workflows" element={<ProtectedRoute><WorkflowList /></ProtectedRoute>} />
      <Route path="/n8n/executions" element={<ProtectedRoute><ExecutionList /></ProtectedRoute>} />
      <Route path="/n8n/credentials" element={<ProtectedRoute><CredentialList /></ProtectedRoute>} />
      <Route path="/n8n/tags" element={<ProtectedRoute><TagList /></ProtectedRoute>} />
      <Route path="/n8n/users" element={<ProtectedRoute><N8nUserList /></ProtectedRoute>} />

      {/* Landing page */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SudoProvider>
            <ConnectionProvider>
              <AppRoutes />
            </ConnectionProvider>
          </SudoProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
