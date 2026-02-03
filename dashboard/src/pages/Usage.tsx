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
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span className="text-red-300">{error}</span>
      </div>
    );
  }

  const isUnlimited = usage?.requests.unlimited || usage?.requests.limit === -1;
  const usagePercent = usage && !isUnlimited
    ? Math.round((usage.requests.used / usage.requests.limit) * 100)
    : 0;

  const currentPlan = plans.find((p) => p.id === user?.plan);
  const dailyLimit = currentPlan?.daily_request_limit ?? 100;
  const minuteLimit = currentPlan?.requests_per_minute ?? 50;

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
        <h1 className="text-2xl font-bold text-n2f-text">Usage & Billing</h1>
        <p className="text-n2f-text-secondary mt-1">
          Monitor your API usage and manage your subscription
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-n2f-text-secondary text-sm">Current Plan</p>
            <h2 className="text-3xl font-bold capitalize mt-1 text-n2f-text">
              {currentPlan?.name || user?.plan}
            </h2>
            <p className="text-n2f-text-secondary mt-2">
              {minuteLimit === -1 ? 'Unlimited' : minuteLimit} req/min
              {' • '}
              {dailyLimit === -1 ? (
                <span className="font-semibold text-emerald-400">Unlimited/day</span>
              ) : (
                `${dailyLimit.toLocaleString()} req/day`
              )}
              {' • '}
              Unlimited instances
            </p>
          </div>
          <div className="text-right">
            {currentPlan?.price_monthly === -1 ? (
              <p className="text-2xl font-bold text-n2f-text">Custom</p>
            ) : (
              <p className="text-4xl font-bold text-n2f-accent">
                ${currentPlan?.price_monthly || 0}
                <span className="text-lg font-normal text-n2f-text-secondary">/mo</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <Activity className="h-5 w-5 text-n2f-accent" />
            </div>
            <span className="text-sm font-medium text-n2f-text-secondary">
              Requests Today
            </span>
          </div>
          {isUnlimited ? (
            <>
              <p className="stat-value">
                {usage?.requests.used.toLocaleString()}
                <span className="text-lg font-normal text-emerald-400 ml-2">
                  Unlimited
                </span>
              </p>
              <div className="mt-3 h-2 bg-emerald-900/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 w-full" />
              </div>
            </>
          ) : (
            <>
              <p className="stat-value">
                {usage?.requests.used.toLocaleString()}
                <span className="text-lg font-normal text-n2f-text-muted">
                  /{usage?.requests.limit.toLocaleString()}
                </span>
              </p>
              <div className="mt-3 h-2 bg-n2f-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    usagePercent >= 90
                      ? 'bg-red-400'
                      : usagePercent >= 70
                      ? 'bg-amber-400'
                      : 'bg-n2f-accent'
                  }`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-n2f-text-secondary">
              Success Rate
            </span>
          </div>
          <p className="stat-value">{usage?.success_rate || 100}%</p>
          <p className="text-sm text-n2f-text-secondary mt-1">
            This month: {usage?.monthly?.used.toLocaleString() || 0} requests
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <span className="text-sm font-medium text-n2f-text-secondary">
              Daily Reset
            </span>
          </div>
          <p className="text-xl font-semibold text-n2f-text">
            {usage?.period}
          </p>
          <p className="text-sm text-n2f-text-secondary mt-1">
            Resets{' '}
            {usage?.reset_at
              ? new Date(usage.reset_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'tomorrow'} (midnight UTC)
          </p>
        </div>
      </div>

      {/* Usage Warning */}
      {!isUnlimited && usagePercent >= 80 && (
        <div
          className={`rounded-lg p-4 flex items-start gap-3 ${
            usagePercent >= 90
              ? 'bg-red-900/30 border border-red-700'
              : 'bg-amber-900/30 border border-amber-700'
          }`}
        >
          <AlertCircle
            className={`h-5 w-5 mt-0.5 ${
              usagePercent >= 90 ? 'text-red-500' : 'text-amber-500'
            }`}
          />
          <div>
            <p
              className={`font-medium ${
                usagePercent >= 90 ? 'text-red-300' : 'text-amber-400'
              }`}
            >
              {usagePercent >= 90
                ? 'Daily limit almost reached'
                : 'Approaching daily limit'}
            </p>
            <p
              className={`text-sm mt-1 ${
                usagePercent >= 90 ? 'text-red-300' : 'text-n2f-text-secondary'
              }`}
            >
              You've used {usagePercent}% of your daily quota. Upgrade to Pro for unlimited requests.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-n2f-text mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === user?.plan;
            const isFree = plan.id === 'free';
            const isEnterprise = plan.id === 'enterprise';
            const isPro = plan.id === 'pro';
            const planDailyLimit = plan.daily_request_limit;
            const planMinuteLimit = plan.requests_per_minute;
            const isDailyUnlimited = planDailyLimit === -1;
            const isMinuteUnlimited = planMinuteLimit === -1;
            const isUpgrade = !isCurrent && (
              (isFree && (isPro || isEnterprise)) ||
              (user?.plan === 'free' && !isFree)
            );

            return (
              <div
                key={plan.id}
                className={`card relative ${
                  isCurrent ? 'border-n2f-accent border-2' : ''
                } ${isPro && !isCurrent ? 'border-n2f-accent/50' : ''}`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-4 bg-n2f-accent text-gray-900 text-xs px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
                {isPro && !isCurrent && (
                  <span className="absolute -top-3 right-4 bg-n2f-accent/20 text-n2f-accent text-xs px-2 py-1 rounded-full">
                    Recommended
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Zap
                    className={`h-5 w-5 ${
                      isCurrent ? 'text-n2f-accent' : 'text-n2f-text-muted'
                    }`}
                  />
                  <h3 className="font-semibold text-n2f-text">{plan.name}</h3>
                </div>

                {isEnterprise ? (
                  <p className="text-2xl font-bold text-n2f-text mb-4">
                    Custom
                    <span className="text-sm font-normal text-n2f-text-secondary block">Contact us</span>
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-n2f-text mb-4">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-n2f-text-secondary">/mo</span>
                  </p>
                )}

                <ul className="space-y-2 text-sm text-n2f-text-secondary mb-6">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-n2f-accent rounded-full" />
                    Unlimited n8n instances
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-n2f-accent rounded-full" />
                    {isEnterprise ? 'Custom' : isMinuteUnlimited ? 'Unlimited' : planMinuteLimit} req/min
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isDailyUnlimited ? 'bg-emerald-400' : 'bg-n2f-accent'}`} />
                    {isEnterprise ? (
                      'Custom daily quota'
                    ) : isDailyUnlimited ? (
                      <span className="text-emerald-400 font-semibold">Unlimited req/day</span>
                    ) : (
                      `${planDailyLimit.toLocaleString()} req/day`
                    )}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-n2f-accent rounded-full" />
                    {plan.features?.support || 'Community'} support
                  </li>
                </ul>

                {isCurrent ? (
                  <button disabled className="btn-secondary w-full opacity-50">
                    Current Plan
                  </button>
                ) : isEnterprise ? (
                  <a
                    href="mailto:contact@node2flow.net?subject=Enterprise%20Inquiry"
                    className="btn-secondary w-full text-center block"
                  >
                    Contact Sales
                  </a>
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