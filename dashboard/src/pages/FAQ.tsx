import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, ChevronDown, Search, HelpCircle, Zap as Lightning, Shield, CreditCard, Code, AlertTriangle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FAQCategory {
  name: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    name: 'Getting Started',
    icon: <Lightning className="h-5 w-5" />,
    items: [
      {
        question: 'What is n8n Management MCP?',
        answer: (
          <div className="space-y-2">
            <p>
              n8n Management MCP is a hosted service that allows AI assistants (like Claude, Cursor, or other MCP-compatible clients)
              to interact with your n8n automation platform.
            </p>
            <p>
              MCP (Model Context Protocol) is a standard protocol that enables AI assistants to use external tools and services.
              Our service acts as a bridge between your AI assistant and your n8n instance.
            </p>
          </div>
        ),
      },
      {
        question: 'How do I get started?',
        answer: (
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Create an account</strong> - Sign up with email or OAuth (GitHub/Google)</li>
            <li><strong>Add your n8n connection</strong> - Enter your n8n instance URL and API key</li>
            <li><strong>Generate an API key</strong> - Create an API key for your MCP client</li>
            <li><strong>Configure your MCP client</strong> - Add the MCP server URL and API key to Claude Desktop, Cursor, etc.</li>
          </ol>
        ),
      },
      {
        question: 'What MCP clients are supported?',
        answer: (
          <div className="space-y-2">
            <p>Any MCP-compatible client should work, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Claude Desktop</strong> - Anthropic's official desktop app</li>
              <li><strong>Cursor</strong> - AI-powered code editor</li>
              <li><strong>Continue</strong> - Open-source AI coding assistant</li>
              <li><strong>Custom clients</strong> - Any app implementing the MCP protocol</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I configure Claude Desktop?',
        answer: (
          <div className="space-y-3">
            <p>Add this to your Claude Desktop configuration file:</p>
            <pre className="bg-black rounded-lg p-3 text-sm text-green-400 overflow-x-auto">
{`{
  "mcpServers": {
    "n8n": {
      "url": "https://n8n-management-mcp.node2flow.net/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
            </pre>
            <p className="text-sm text-n2f-text-muted">
              Replace <code className="bg-n2f-elevated px-1 rounded">YOUR_API_KEY</code> with your actual API key from the Connections page.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    name: 'n8n Connection',
    icon: <Code className="h-5 w-5" />,
    items: [
      {
        question: 'How do I get my n8n API key?',
        answer: (
          <ol className="list-decimal pl-5 space-y-2">
            <li>Log in to your n8n instance</li>
            <li>Go to <strong>Settings → API</strong> (or click your user icon → Settings)</li>
            <li>Click <strong>"Create API Key"</strong></li>
            <li>Give it a name and copy the generated key</li>
            <li>Paste it when adding a connection in our dashboard</li>
          </ol>
        ),
      },
      {
        question: 'Is my n8n API key secure?',
        answer: (
          <div className="space-y-2">
            <p>Yes, we take security seriously:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your n8n API key is <strong>encrypted with AES-256-GCM</strong> before storage</li>
              <li>Encryption uses a unique key that is not stored in the database</li>
              <li>We only decrypt the key when proxying requests to your n8n instance</li>
              <li>All communications use HTTPS/TLS encryption</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'Can I connect multiple n8n instances?',
        answer: 'Yes! You can add multiple n8n connections to your account. Each connection can have its own API keys for different MCP clients or purposes.',
      },
      {
        question: 'What n8n features can I access via MCP?',
        answer: (
          <div className="space-y-2">
            <p>Our MCP server provides 31 tools covering:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Workflows</strong> - List, get, create, update, delete, activate/deactivate</li>
              <li><strong>Executions</strong> - List, get details, delete, retry failed executions</li>
              <li><strong>Credentials</strong> - List, get, create, delete credential entries</li>
              <li><strong>Tags</strong> - List, create, update, delete workflow tags</li>
              <li><strong>Variables</strong> - List, create, delete environment variables</li>
              <li><strong>Users</strong> - List and manage n8n users (admin only)</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'Why is my connection showing "error" status?',
        answer: (
          <div className="space-y-2">
            <p>Common reasons for connection errors:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Invalid API key</strong> - The n8n API key may have been revoked or expired</li>
              <li><strong>n8n instance unreachable</strong> - Your n8n server may be down or behind a firewall</li>
              <li><strong>Incorrect URL</strong> - Make sure the URL includes the protocol (https://)</li>
              <li><strong>API not enabled</strong> - Ensure the Public API is enabled in n8n settings</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    name: 'API Keys & Authentication',
    icon: <Shield className="h-5 w-5" />,
    items: [
      {
        question: 'What is the difference between n8n API keys and service API keys?',
        answer: (
          <div className="space-y-2">
            <p>There are two types of API keys:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>n8n API key</strong> - Generated in your n8n instance. Used to authenticate
                our service with your n8n. Stored encrypted.
              </li>
              <li>
                <strong>Service API key (n2f_...)</strong> - Generated in our dashboard. Used to authenticate
                your MCP client with our service. Stored as a hash.
              </li>
            </ul>
          </div>
        ),
      },
      {
        question: 'I lost my API key. Can you recover it?',
        answer: 'No, we cannot recover API keys. For security, we only store a hash of the key, not the actual key. You\'ll need to generate a new API key and update your MCP client configuration.',
      },
      {
        question: 'How do I revoke an API key?',
        answer: (
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to <strong>Dashboard → Connections</strong></li>
            <li>Find the connection with the API key</li>
            <li>Click the <strong>trash icon</strong> next to the key</li>
            <li>Confirm the revocation (requires 2FA if enabled)</li>
          </ol>
        ),
      },
      {
        question: 'What is two-factor authentication (2FA)?',
        answer: (
          <div className="space-y-2">
            <p>
              2FA adds an extra layer of security by requiring a time-based code from an authenticator app
              (like Google Authenticator, Authy, or 1Password) in addition to your password.
            </p>
            <p>
              When enabled, sensitive actions like deleting connections, revoking API keys, or changing
              your password will require you to enter a 2FA code.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    name: 'Billing & Plans',
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      {
        question: 'What are the plan limits?',
        answer: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-n2f-border">
                  <th className="text-left py-2">Plan</th>
                  <th className="text-left py-2">Price</th>
                  <th className="text-left py-2">Daily Limit</th>
                  <th className="text-left py-2">Rate Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-n2f-border">
                <tr>
                  <td className="py-2">Free</td>
                  <td className="py-2">$0/month</td>
                  <td className="py-2">100 req/day</td>
                  <td className="py-2">50 req/min</td>
                </tr>
                <tr>
                  <td className="py-2">Pro</td>
                  <td className="py-2">$19/month</td>
                  <td className="py-2">5,000 req/day</td>
                  <td className="py-2">100 req/min</td>
                </tr>
                <tr>
                  <td className="py-2">Enterprise</td>
                  <td className="py-2">Custom</td>
                  <td className="py-2">Unlimited</td>
                  <td className="py-2">Custom</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        question: 'What happens if I exceed my daily limit?',
        answer: 'Once you reach your daily limit, API requests will return a 429 (Too Many Requests) error until the limit resets at midnight UTC. You can upgrade your plan anytime for higher limits.',
      },
      {
        question: 'How do I upgrade or downgrade my plan?',
        answer: (
          <div className="space-y-2">
            <p><strong>To upgrade:</strong> Go to Dashboard → Settings → Billing and select a new plan. Upgrades take effect immediately with prorated billing.</p>
            <p><strong>To downgrade:</strong> Same process, but downgrades take effect at the start of your next billing cycle.</p>
          </div>
        ),
      },
      {
        question: 'Do you offer refunds?',
        answer: 'We do not offer refunds for partial months. However, you can cancel your subscription at any time, and you\'ll continue to have access until the end of your current billing period.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit and debit cards via Stripe, including Visa, Mastercard, American Express, and Discover. We also support some regional payment methods depending on your location.',
      },
    ],
  },
  {
    name: 'Troubleshooting',
    icon: <AlertTriangle className="h-5 w-5" />,
    items: [
      {
        question: 'MCP client shows "connection refused" error',
        answer: (
          <div className="space-y-2">
            <p>Check the following:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verify the MCP server URL is correct: <code className="bg-n2f-elevated px-1 rounded">https://n8n-management-mcp.node2flow.net/mcp</code></li>
              <li>Ensure your API key starts with <code className="bg-n2f-elevated px-1 rounded">n2f_</code></li>
              <li>Check that the API key hasn't been revoked</li>
              <li>Make sure the Authorization header format is correct: <code className="bg-n2f-elevated px-1 rounded">Bearer n2f_...</code></li>
            </ul>
          </div>
        ),
      },
      {
        question: 'I\'m getting "unauthorized" errors',
        answer: (
          <div className="space-y-2">
            <p>This usually means:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The API key is invalid or has been revoked</li>
              <li>The API key doesn't have access to the requested connection</li>
              <li>The Authorization header is missing or malformed</li>
            </ul>
            <p>Try generating a new API key and updating your MCP client configuration.</p>
          </div>
        ),
      },
      {
        question: 'Workflows are not showing up',
        answer: (
          <div className="space-y-2">
            <p>If the workflow list is empty:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verify your n8n connection status is "active"</li>
              <li>Check that your n8n API key has permission to access workflows</li>
              <li>Ensure the n8n instance URL is correct and accessible</li>
              <li>Try refreshing or re-adding the connection</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I report a bug?',
        answer: (
          <div className="space-y-2">
            <p>You can report bugs through:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Email:</strong>{' '}
                <a href="mailto:support@node2flow.net" className="text-n2f-accent hover:underline">
                  support@node2flow.net
                </a>
              </li>
              <li>
                <strong>GitHub Issues:</strong> If you have access to our repository
              </li>
            </ul>
            <p>Please include: steps to reproduce, expected vs actual behavior, and any error messages.</p>
          </div>
        ),
      },
    ],
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-n2f-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-n2f-elevated transition-colors"
      >
        <span className="font-medium text-n2f-text pr-4">{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 text-n2f-text-muted flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-n2f-text-secondary">
          {typeof item.answer === 'string' ? <p>{item.answer}</p> : item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Filter FAQ items based on search query
  const filteredCategories = faqData
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof item.answer === 'string' &&
            item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
      <header className="border-b border-n2f-border sticky top-0 bg-n2f-bg/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-n2f-accent p-2 rounded-lg">
                <Zap className="h-5 w-5 text-gray-900" />
              </div>
              <span className="text-xl font-bold text-n2f-text">n8n Management MCP</span>
            </Link>
            <Link to="/" className="text-n2f-text-secondary hover:text-n2f-text flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-n2f-accent/10 rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-n2f-accent" />
          </div>
          <h1 className="text-3xl font-bold text-n2f-text mb-2">Frequently Asked Questions</h1>
          <p className="text-n2f-text-secondary max-w-xl mx-auto">
            Find answers to common questions about n8n Management MCP. Can't find what you're looking for?{' '}
            <a href="mailto:support@node2flow.net" className="text-n2f-accent hover:underline">
              Contact support
            </a>
            .
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-n2f-text-muted" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-n2f-card border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
          />
        </div>

        {/* FAQ Categories */}
        {filteredCategories.length > 0 ? (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <section key={category.name}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-n2f-accent">{category.icon}</div>
                  <h2 className="text-xl font-semibold text-n2f-text">{category.name}</h2>
                </div>
                <div className="space-y-3">
                  {category.items.map((item, index) => {
                    const key = `${category.name}-${index}`;
                    return (
                      <FAQAccordion
                        key={key}
                        item={item}
                        isOpen={openItems.has(key)}
                        onToggle={() => toggleItem(key)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-n2f-text-secondary mb-4">No results found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-n2f-accent hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Still need help */}
        <div className="mt-12 bg-n2f-card border border-n2f-border rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-n2f-text mb-2">Still have questions?</h3>
          <p className="text-n2f-text-secondary mb-4">
            We're here to help. Reach out to our support team.
          </p>
          <a
            href="mailto:support@node2flow.net"
            className="inline-flex items-center gap-2 bg-n2f-accent hover:bg-orange-600 text-gray-900 font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-8 border-t border-n2f-border flex justify-between text-sm">
          <Link to="/terms" className="text-n2f-accent hover:underline">
            Terms of Service
          </Link>
          <Link to="/privacy" className="text-n2f-accent hover:underline">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
