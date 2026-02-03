import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, type AdminStats } from '../../lib/api';
import { Users, DollarSign, Activity, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const res = await getAdminStats();
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats?.total_users || 0, sub: `${stats?.active_users || 0} active`, icon: Users, color: 'blue', link: '/admin/users' },
    { label: 'MRR', value: `$${(stats?.mrr || 0).toFixed(2)}`, sub: 'Monthly recurring revenue', icon: DollarSign, color: 'green', link: '/admin/revenue' },
    { label: 'Requests Today', value: stats?.total_requests_today || 0, sub: 'API calls today', icon: Activity, color: 'purple', link: '/admin/analytics' },
    { label: 'Error Rate', value: `${stats?.error_rate_today || 0}%`, sub: 'Today\'s error rate', icon: AlertTriangle, color: stats?.error_rate_today && stats.error_rate_today > 10 ? 'red' : 'yellow', link: '/admin/health' },
  ];

  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-n2f-accent/10', icon: 'text-n2f-accent' },
    green: { bg: 'bg-emerald-900/30', icon: 'text-emerald-400' },
    purple: { bg: 'bg-purple-900/30', icon: 'text-purple-400' },
    yellow: { bg: 'bg-amber-900/30', icon: 'text-amber-400' },
    red: { bg: 'bg-red-900/30', icon: 'text-red-400' },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Admin Overview</h1>
        <p className="text-n2f-text-secondary mt-1">Platform metrics at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const colors = colorMap[card.color];
          return (
            <Link key={card.label} to={card.link} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <card.icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <span className="text-sm font-medium text-n2f-text-secondary">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-n2f-text">{card.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-n2f-text-secondary">{card.sub}</p>
                <ArrowRight className="h-4 w-4 text-n2f-text-muted" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
