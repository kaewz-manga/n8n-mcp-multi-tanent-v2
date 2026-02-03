import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Users,
  BarChart3,
  DollarSign,
  HeartPulse,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const adminNav = [
  { name: 'Overview', href: '/admin', icon: Shield },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { name: 'System Health', href: '/admin/health', icon: HeartPulse },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-n2f-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-n2f-card border-r border-n2f-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-n2f-border">
            <div className="bg-n2f-accent p-2 rounded-lg">
              <Shield className="h-5 w-5 text-gray-900" />
            </div>
            <span className="font-semibold text-n2f-text">Admin Panel</span>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-n2f-text-secondary" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {adminNav.map((item) => {
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

            <div className="pt-4 mt-4 border-t border-n2f-border">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-n2f-accent hover:bg-n2f-accent/10"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </Link>
            </div>
          </nav>

          <div className="p-4 border-t border-n2f-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-n2f-text truncate">{user?.email}</p>
                <p className="text-xs text-n2f-accent font-medium">Admin</p>
              </div>
              <button onClick={logout} className="p-2 text-n2f-text-muted hover:text-n2f-text rounded-lg hover:bg-n2f-elevated" title="Sign out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-n2f-card border-b border-n2f-border lg:hidden">
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-n2f-text-secondary hover:text-n2f-text">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-n2f-accent p-1.5 rounded-lg">
                <Shield className="h-4 w-4 text-gray-900" />
              </div>
              <span className="font-semibold text-n2f-text">Admin Panel</span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
