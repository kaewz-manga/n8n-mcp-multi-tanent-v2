import { useEffect, useState } from 'react';
import type { Usage as UsageType, Plan } from '../lib/api';
import { getUsage, getPlans, createCheckoutSession } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  TrendingUp,
  Calendar,
  Zap,
  Loader2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

export default function Usage() {
  const { user, isAdmin } = useAuth();
  const [usage, setUsage] = useState<UsageType | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usageRes, plansRes] = await Promise.all([
          getUsage(),
          getPlans(),
        ]);

        if (usageRes.success && usageRes.data) {
          setUsage(usageRes.data);
        }

        if (plansRes.success && plansRes.data) {
          setPlans(plansRes.data.plans);
        }
      } catch {
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span className="text-red-700">{error}</span>
      </div>
    );
  }

  const usagePercent = usage
    ? Math.round((usage.requests.used / usage.requests.limit) * 100)
    : 0;

  const currentPlan = plans.find((p) => p.id === user?.plan);

  async function handleChangePlan(planId: string) {
    setCheckoutLoading(planId);
    try {
      const res = await createCheckoutSession(planId);
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.error?.message || 'Failed to create checkout session');
      }
    } catch {
      setError('Failed to connect to billing service');
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage & Billing</h1>
        <p className="text-gray-500 mt-1">
          Monitor your API usage and manage your subscription
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Current Plan</p>
            <h2 className="text-3xl font-bold capitalize mt-1">
              {currentPlan?.name || user?.plan}
            </h2>
            <p className="text-blue-100 mt-2">
              {currentPlan?.monthly_request_limit.toLocaleString()} requests/month
              {' • '}
              {currentPlan?.max_connections === -1
                ? 'Unlimited'
                : currentPlan?.max_connections}{' '}
              connections
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">
              ${currentPlan?.price_monthly || 0}
              <span className="text-lg font-normal text-blue-200">/mo</span>
            </p>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Requests This Month
            </span>
          </div>
          <p className="stat-value">
            {usage?.requests.used.toLocaleString()}
            <span className="text-lg font-normal text-gray-400">
              /{usage?.requests.limit.toLocaleString()}
            </span>
          </p>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                usagePercent >= 90
                  ? 'bg-red-500'
                  : usagePercent >= 70
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Success Rate
            </span>
          </div>
          <p className="stat-value">{usage?.success_rate || 100}%</p>
          <p className="text-sm text-gray-500 mt-1">
            All time success rate
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Billing Period
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {usage?.period}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Resets{' '}
            {usage?.reset_at
              ? new Date(usage.reset_at).toLocaleDateString()
              : 'next month'}
          </p>
        </div>
      </div>

      {/* Usage Warning */}
      {usagePercent >= 80 && (
        <div
          className={`rounded-lg p-4 flex items-start gap-3 ${
            usagePercent >= 90
              ? 'bg-red-50 border border-red-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <AlertCircle
            className={`h-5 w-5 mt-0.5 ${
              usagePercent >= 90 ? 'text-red-500' : 'text-yellow-500'
            }`}
          />
          <div>
            <p
              className={`font-medium ${
                usagePercent >= 90 ? 'text-red-800' : 'text-yellow-800'
              }`}
            >
              {usagePercent >= 90
                ? 'Usage limit almost reached'
                : 'Approaching usage limit'}
            </p>
            <p
              className={`text-sm mt-1 ${
                usagePercent >= 90 ? 'text-red-700' : 'text-yellow-700'
              }`}
            >
              You've used {usagePercent}% of your monthly quota. Consider
              upgrading to avoid interruptions.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === user?.plan;
            const isFree = plan.price_monthly === 0;
            const isBlurred = !isAdmin && !isFree;
            const isUpgrade =
              (plans.findIndex((p) => p.id === plan.id) >
                plans.findIndex((p) => p.id === user?.plan)) &&
              !isCurrent;

            return (
              <div
                key={plan.id}
                className={`card relative ${
                  isCurrent ? 'border-blue-500 border-2' : ''
                } ${isBlurred ? 'blur-sm select-none pointer-events-none' : ''}`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    Current
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Zap
                    className={`h-5 w-5 ${
                      isCurrent ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                </div>

                <p className="text-3xl font-bold text-gray-900 mb-4">
                  {!isAdmin && !isFree ? '$xx.xx' : `$${plan.price_monthly}`}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>

                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {plan.monthly_request_limit.toLocaleString()} requests/month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {plan.max_connections === -1
                      ? 'Unlimited'
                      : plan.max_connections}{' '}
                    connections
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {plan.features?.support || 'Community'} support
                  </li>
                </ul>

                {isCurrent ? (
                  <button disabled className="btn-secondary w-full opacity-50">
                    Current Plan
                  </button>
                ) : isUpgrade ? (
                  <button
                    className="btn-primary w-full"
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={checkoutLoading === plan.id}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Upgrade
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="btn-secondary w-full"
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={checkoutLoading === plan.id}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Downgrade'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
