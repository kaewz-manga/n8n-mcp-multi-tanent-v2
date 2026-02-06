import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnection } from '../contexts/ConnectionContext';
import {
  Zap,
  LayoutDashboard,
  Link as LinkIcon,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Workflow,
  PlayCircle,
  Key,
  Tag,
  Users,
  ChevronDown,
  Server,
  FileText,
  HelpCircle,
  Activity,
} from 'lucide-react';
import FeedbackBubble from './FeedbackBubble';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Connections', href: '/connections', icon: LinkIcon },
  { name: 'Usage', href: '/usage', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const resourceNavigation = [
  { name: 'Documentation', href: '/docs', icon: FileText },
  { name: 'FAQ', href: '/faq', icon: HelpCircle },
  { name: 'Status', href: '/status', icon: Activity },
];

const n8nNavigation = [
  { name: 'Workflows', href: '/n8n/workflows', icon: Workflow },
  { name: 'Executions', href: '/n8n/executions', icon: PlayCircle },
  { name: 'Credentials', href: '/n8n/credentials', icon: Key },
  { name: 'Tags', href: '/n8n/tags', icon: Tag },
  { name: 'Users', href: '/n8n/users', icon: Users },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const { connections, activeConnection, setActiveConnectionId } = useConnection();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [n8nExpanded, setN8nExpanded] = useState(location.pathname.startsWith('/n8n'));

  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-n2f-card border-r border-n2f-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-n2f-border">
            <div className="bg-n2f-accent p-2 rounded-lg">
              <Zap className="h-5 w-5 text-gray-900" />
            </div>
            <span className="font-semibold text-n2f-text">n8n Management MCP</span>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-n2f-text-secondary" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-n2f-accent/10 text-n2f-accent'
                      : 'text-n2f-text-secondary hover:bg-n2f-elevated'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {/* Resources */}
            <div className="pt-4 mt-4 border-t border-n2f-border">
              <p className="px-3 mb-1 text-xs font-semibold text-n2f-text-muted uppercase tracking-wider">Resources</p>
              {resourceNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-n2f-accent/10 text-n2f-accent'
                        : 'text-n2f-text-secondary hover:bg-n2f-elevated'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* n8n Management - Admin only */}
            {isAdmin && connections.length > 0 && (
              <div className="pt-4 mt-4 border-t border-n2f-border">
                <button
                  onClick={() => setN8nExpanded(!n8nExpanded)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-n2f-text-secondary hover:bg-n2f-elevated w-full"
                >
                  <Server className="h-5 w-5" />
                  <span className="flex-1 text-left">n8n Management</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${n8nExpanded ? 'rotate-180' : ''}`} />
                </button>
                {n8nExpanded && (
                  <div className="mt-1 space-y-0.5">
                    {/* Connection selector */}
                    <div className="px-3 py-1.5">
                      <select
                        value={activeConnection?.id || ''}
                        onChange={(e) => setActiveConnectionId(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-n2f-border rounded-lg bg-n2f-card text-n2f-text-secondary focus:ring-2 focus:ring-blue-500"
                      >
                        {connections.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {n8nNavigation.map((item) => {
                      const isActive = location.pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center gap-3 px-3 py-2 ml-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-n2f-accent/10 text-n2f-accent'
                              : 'text-n2f-text-muted hover:bg-n2f-elevated'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-n2f-border">
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/30"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Shield className="h-5 w-5" />
                  Admin Panel
                </Link>
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-n2f-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-n2f-text truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-n2f-text-secondary capitalize">
                  {user?.plan} plan
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-n2f-text-muted hover:text-n2f-text rounded-lg hover:bg-n2f-elevated"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-n2f-card border-b border-n2f-border lg:hidden">
          <div className="flex items-center gap-4 px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-n2f-text-secondary hover:text-n2f-text"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-n2f-accent p-1.5 rounded-lg">
                <Zap className="h-4 w-4 text-gray-900" />
              </div>
              <span className="font-semibold text-n2f-text">n8n Management MCP</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Feedback bubble */}
      <FeedbackBubble />
    </div>
  );
}
