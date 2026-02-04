import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlans, type Plan } from '../lib/api';
import {
  Zap,
  Shield,
  BarChart3,
  Globe,
  Code,
  Bot,
  Check,
  ArrowRight,
  Github,
  ExternalLink,
} from 'lucide-react';

export default function Landing() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    getPlans().then((res) => {
      if (res.success && res.data) {
        setPlans(res.data.plans);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
      <header className="border-b border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-n2f-accent p-2 rounded-lg">
                <Zap className="h-5 w-5 text-gray-900" />
              </div>
              <span className="text-xl font-bold text-n2f-text">n8n Management MCP</span>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-n2f-text-secondary hover:text-n2f-text">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-n2f-card to-n2f-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-n2f-text mb-6">
            Control n8n with AI
          </h1>
          <p className="text-xl text-n2f-text-secondary max-w-2xl mx-auto mb-8">
            Connect your AI assistant to n8n automation. Let Claude, Cursor, or any MCP-compatible client
            manage your workflows, executions, and more.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Start Free <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-lg px-8 py-3"
            >
              <Github className="h-5 w-5 mr-2" />
              Learn about MCP
            </a>
          </div>

          {/* Demo Code Block */}
          <div className="max-w-2xl mx-auto bg-black rounded-xl p-6 text-left shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-n2f-text-muted text-sm">Claude Desktop</span>
            </div>
            <pre className="text-sm text-green-400 overflow-x-auto">
              <code>{`> List all my n8n workflows

I found 5 workflows in your n8n instance:

1. Email Newsletter (active)
2. Slack Notifications (active)
3. Data Sync Pipeline (inactive)
4. Customer Onboarding (active)
5. Weekly Reports (active)

Would you like me to activate the Data Sync Pipeline?`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-n2f-text mb-4">
              Everything you need to automate with AI
            </h2>
            <p className="text-lg text-n2f-text-secondary max-w-2xl mx-auto">
              Our MCP server provides a complete interface between your AI assistant and n8n.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title="AI-Powered Control"
              description="Let your AI assistant manage workflows, create automations, and handle executions through natural language."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure by Design"
              description="Your n8n credentials are encrypted at rest. API keys are hashed and can be revoked instantly."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Multi-Instance Support"
              description="Connect multiple n8n instances. Switch between production and staging with different API keys."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Usage Analytics"
              description="Track API usage, monitor success rates, and optimize your automation workflows."
            />
            <FeatureCard
              icon={<Code className="h-6 w-6" />}
              title="Full n8n API Access"
              description="Workflows, executions, credentials, tags, variables, and users - all accessible through MCP."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Edge Deployment"
              description="Deployed on Cloudflare Workers for low latency worldwide. Your AI gets instant responses."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-n2f-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-n2f-text mb-4">
              Get started in 3 steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              title="Create Account"
              description="Sign up with email or OAuth (GitHub/Google). No credit card required for free tier."
            />
            <StepCard
              number={2}
              title="Connect n8n"
              description="Add your n8n instance URL and API key. We'll encrypt and securely store your credentials."
            />
            <StepCard
              number={3}
              title="Configure MCP Client"
              description="Add the MCP server URL and your API key to Claude Desktop, Cursor, or any MCP client."
            />
          </div>

          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-n2f-card rounded-xl border border-n2f-border p-6">
              <h3 className="font-semibold text-n2f-text mb-4">MCP Client Configuration</h3>
              <pre className="bg-black rounded-lg p-4 text-sm text-green-400 overflow-x-auto">
{`{
  "mcpServers": {
    "n8n": {
      "url": "https://your-api.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-n2f-text mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-n2f-text-secondary">
              Start free, upgrade when you need more.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-n2f-card border-t border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-n2f-text mb-4">
            Ready to automate with AI?
          </h2>
          <p className="text-xl text-n2f-text-secondary mb-8 max-w-2xl mx-auto">
            Join developers using n8n Management MCP to supercharge their automation workflows.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-n2f-accent text-gray-900 font-semibold rounded-lg hover:bg-n2f-accent-hover transition-colors"
          >
            Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-n2f-bg border-t border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
            {/* Product */}
            <div>
              <h3 className="text-n2f-text font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-n2f-text-muted hover:text-n2f-accent">Features</a></li>
                <li><a href="#pricing" className="text-n2f-text-muted hover:text-n2f-accent">Pricing</a></li>
                <li><a href="#demo" className="text-n2f-text-muted hover:text-n2f-accent">Demo</a></li>
                <li><Link to="/faq" className="text-n2f-text-muted hover:text-n2f-accent">FAQ</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-n2f-text font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-n2f-text-muted hover:text-n2f-accent">Documentation</a></li>
                <li><a href="#" className="text-n2f-text-muted hover:text-n2f-accent">API Reference</a></li>
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-n2f-text-muted hover:text-n2f-accent inline-flex items-center gap-1">
                    GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://docs.n8n.io" target="_blank" rel="noopener noreferrer" className="text-n2f-text-muted hover:text-n2f-accent inline-flex items-center gap-1">
                    n8n Documentation <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-n2f-text font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="mailto:contact@node2flow.net" className="text-n2f-text-muted hover:text-n2f-accent">Contact</a></li>
                <li>
                  <Link to="/privacy" className="text-n2f-text-muted hover:text-n2f-accent inline-flex items-center gap-1">
                    Privacy Policy <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-n2f-text-muted hover:text-n2f-accent inline-flex items-center gap-1">
                    Terms of Service <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-n2f-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-n2f-accent p-2 rounded-lg">
                <Zap className="h-4 w-4 text-gray-900" />
              </div>
              <span className="text-lg font-bold text-n2f-text">n8n Management MCP</span>
            </div>
            <p className="text-n2f-text-muted text-sm">
              &copy; {new Date().getFullYear()} n8n Management MCP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-n2f-card p-6 rounded-xl border border-n2f-border hover:border-n2f-accent/30 hover:shadow-lg transition-all">
      <div className="bg-n2f-accent/10 w-12 h-12 rounded-lg flex items-center justify-center text-n2f-accent mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-n2f-text mb-2">{title}</h3>
      <p className="text-n2f-text-secondary">{description}</p>
    </div>
  );
}

// Pricing Card Component
function PricingCard({ plan }: { plan: Plan }) {
  const isPopular = plan.id === 'pro';
  const isFree = plan.id === 'free';
  const isEnterprise = plan.id === 'enterprise';
  const features = plan.features as Record<string, any>;
  const dailyLimit = plan.daily_request_limit;
  const minuteLimit = plan.requests_per_minute;
  const isDailyUnlimited = dailyLimit === -1;
  const isMinuteUnlimited = minuteLimit === -1;

  return (
    <div
      className={`bg-n2f-card rounded-xl border-2 p-6 relative ${
        isPopular ? 'border-n2f-accent shadow-lg scale-105' : 'border-n2f-border'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-n2f-accent text-gray-900 text-xs font-semibold px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}

      <h3 className="text-xl font-semibold text-n2f-text mb-2">{plan.name}</h3>
      <div className="mb-6">
        {isEnterprise ? (
          <div>
            <span className="text-2xl font-bold text-n2f-text">Custom</span>
            <p className="text-n2f-text-secondary text-sm mt-1">Contact us</p>
          </div>
        ) : (
          <>
            <span className="text-4xl font-bold text-n2f-text">
              ${plan.price_monthly}
            </span>
            <span className="text-n2f-text-secondary">/month</span>
          </>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {/* n8n Instances */}
        <li className="flex items-center gap-2 text-sm text-n2f-text-secondary">
          <Check className="h-4 w-4 text-emerald-400" />
          {isEnterprise ? 'Custom' : 'Unlimited'} n8n instances
        </li>
        {/* Rate Limits */}
        <li className="flex items-center gap-2 text-sm text-n2f-text-secondary">
          <Check className="h-4 w-4 text-emerald-400" />
          {isEnterprise ? (
            'Custom rate limits'
          ) : (
            <span>
              {isMinuteUnlimited ? 'Unlimited' : minuteLimit} req/min
              {features.fair_use && <span className="text-n2f-text-muted"> (fair use)</span>}
            </span>
          )}
        </li>
        <li className="flex items-center gap-2 text-sm text-n2f-text-secondary">
          <Check className="h-4 w-4 text-emerald-400" />
          {isEnterprise ? (
            'Custom daily quota'
          ) : isDailyUnlimited ? (
            <span className="text-n2f-accent font-semibold">Unlimited req/day</span>
          ) : (
            <span>
              {dailyLimit.toLocaleString()} req/day
              {features.fair_use && <span className="text-n2f-text-muted"> (fair use)</span>}
            </span>
          )}
        </li>
        {features.analytics && (
          <li className="flex items-center gap-2 text-sm text-n2f-text-secondary">
            <Check className="h-4 w-4 text-emerald-400" />
            Usage analytics
          </li>
        )}
        {features.support && (
          <li className="flex items-center gap-2 text-sm text-n2f-text-secondary">
            <Check className="h-4 w-4 text-emerald-400" />
            {features.support.charAt(0).toUpperCase() + features.support.slice(1)} support
          </li>
        )}
        {features.private_server && (
          <li className="flex items-center gap-2 text-sm text-n2f-text-secondary">
            <Check className="h-4 w-4 text-emerald-400" />
            Private MCP server
          </li>
        )}
      </ul>

      {isFree ? (
        <Link
          to="/register"
          className="block w-full text-center py-2 rounded-lg font-medium bg-n2f-card text-n2f-text hover:bg-n2f-elevated border border-n2f-border transition-colors"
        >
          Start Free
        </Link>
      ) : isEnterprise ? (
        <a
          href="mailto:contact@node2flow.net?subject=Enterprise%20Inquiry"
          className="block w-full text-center py-2 rounded-lg font-medium bg-n2f-card text-n2f-text hover:bg-n2f-elevated border border-n2f-border transition-colors"
        >
          Contact Sales
        </a>
      ) : (
        <Link
          to="/register"
          className="block w-full text-center py-2 rounded-lg font-medium bg-n2f-accent text-gray-900 hover:bg-n2f-accent-hover transition-colors"
        >
          Get Started
        </Link>
      )}
    </div>
  );
}

// Step Card Component
function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="bg-n2f-accent w-12 h-12 rounded-full flex items-center justify-center text-gray-900 font-bold text-xl mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-n2f-text mb-2">{title}</h3>
      <p className="text-n2f-text-secondary">{description}</p>
    </div>
  );
}

