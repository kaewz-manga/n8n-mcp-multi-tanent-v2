import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getConnections, isAuthenticated, type Connection } from '../lib/api';
import { useAuth } from './AuthContext';

interface ConnectionContextType {
  connections: Connection[];
  activeConnection: Connection | null;
  activeConnectionId: string | null;
  setActiveConnectionId: (id: string) => void;
  loading: boolean;
  refreshConnections: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);
const STORAGE_KEY = 'n8n_active_connection';

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveId] = useState<string | null>(
    localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const refreshConnections = useCallback(async () => {
    if (!isAuthenticated()) {
      setConnections([]);
      setLoading(false);
      return;
    }
    try {
      const res = await getConnections();
      if (res.success && res.data) {
        const conns = res.data.connections;
        setConnections(conns);
        // Auto-select if only one connection or stored ID is invalid
        const stored = localStorage.getItem(STORAGE_KEY);
        const valid = conns.find(c => c.id === stored);
        if (!valid && conns.length > 0) {
          const id = conns[0].id;
          localStorage.setItem(STORAGE_KEY, id);
          setActiveId(id);
        }
      } else {
        setConnections([]);
      }
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch when user changes (login/logout)
  useEffect(() => {
    if (user) {
      refreshConnections();
    } else {
      setConnections([]);
      setLoading(false);
    }
  }, [user]);

  const setActiveConnectionId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
  };

  const activeConnection = connections.find(c => c.id === activeConnectionId) || null;

  return (
    <ConnectionContext.Provider value={{ connections, activeConnection, activeConnectionId, setActiveConnectionId, loading, refreshConnections }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) throw new Error('useConnection must be used within ConnectionProvider');
  return context;
}
