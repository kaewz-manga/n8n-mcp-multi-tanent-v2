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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">n8n MCP</span>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
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
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Control n8n with AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
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
          <div className="max-w-2xl mx-auto bg-gray-900 rounded-xl p-6 text-left shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-gray-400 text-sm">Claude Desktop</span>
            </div>
            <pre className="text-sm text-gray-100 overflow-x-auto">
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to automate with AI
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">MCP Client Configuration</h3>
              <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-100 overflow-x-auto">
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you need more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to automate with AI?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join developers using n8n MCP to supercharge their automation workflows.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get Started Free <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">n8n MCP</span>
            </div>

            <div className="flex items-center gap-6 text-gray-400">
              <a href="#" className="hover:text-white">Documentation</a>
              <a href="#" className="hover:text-white">API Reference</a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>

            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} n8n MCP. All rights reserved.
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
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all">
      <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Pricing Card Component
function PricingCard({ plan }: { plan: Plan }) {
  const isPopular = plan.id === 'pro';
  const isFree = plan.price_monthly === 0;
  const features = plan.features as Record<string, any>;

  return (
    <div
      className={`bg-white rounded-xl border-2 p-6 relative ${
        isPopular ? 'border-blue-600 shadow-lg' : 'border-gray-200'
      } ${!isFree ? 'blur-sm select-none pointer-events-none' : ''}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          Popular
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900">
          {isFree ? `$${plan.price_monthly}` : '$xx.xx'}
        </span>
        <span className="text-gray-500">/month</span>
      </div>

      <ul className="space-y-3 mb-6">
        <li className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500" />
          {plan.monthly_request_limit.toLocaleString()} requests/month
        </li>
        <li className="flex items-center gap-2 text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500" />
          {plan.max_connections === -1 ? 'Unlimited' : plan.max_connections} n8n connections
        </li>
        {features.analytics && (
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500" />
            Usage analytics
          </li>
        )}
        {features.support && (
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500" />
            {features.support.charAt(0).toUpperCase() + features.support.slice(1)} support
          </li>
        )}
        {features.sla && (
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-500" />
            SLA guarantee
          </li>
        )}
      </ul>

      {isFree ? (
        <Link
          to="/register"
          className="block w-full text-center py-2 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
        >
          Start Free
        </Link>
      ) : (
        <div className="block w-full text-center py-2 rounded-lg font-medium bg-gray-100 text-gray-400">
          Coming Soon
        </div>
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
      <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

