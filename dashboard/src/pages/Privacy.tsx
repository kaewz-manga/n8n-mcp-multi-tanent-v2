import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
      <header className="border-b border-n2f-border">
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
        <h1 className="text-3xl font-bold text-n2f-text mb-8">Privacy Policy</h1>

        <div className="space-y-8 text-n2f-text-secondary">
          <p className="text-sm text-n2f-text-muted">Last updated: February 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">1. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-n2f-text">Account Information:</strong> Email address and password (securely hashed)</li>
              <li><strong className="text-n2f-text">Connection Data:</strong> n8n instance URLs and API keys (encrypted at rest)</li>
              <li><strong className="text-n2f-text">Usage Data:</strong> API requests, timestamps, and tool usage statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">2. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Process your requests to n8n instances</li>
              <li>Track usage for plan limits and billing</li>
              <li>Improve and optimize the Service</li>
              <li>Communicate with you about your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">3. Data Security</h2>
            <p className="mb-3">We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Passwords are hashed using PBKDF2 with 100,000 iterations</li>
              <li>n8n API keys are encrypted using AES-256-GCM</li>
              <li>All communications use HTTPS/TLS encryption</li>
              <li>API keys are stored as SHA-256 hashes (plain text never stored)</li>
              <li>Two-factor authentication (TOTP) available for additional security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">4. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service providers that help us operate (e.g., Cloudflare for hosting)</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You can delete your account at any time through the Settings page, which will permanently remove all associated data including connections, API keys, and usage history.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">7. Cookies</h2>
            <p>We use essential cookies for authentication (JWT tokens stored in localStorage). We do not use tracking cookies or third-party analytics.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of significant changes via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">9. Contact</h2>
            <p>For privacy-related questions, please contact us at{' '}
              <a href="mailto:contact@node2flow.net" className="text-n2f-accent hover:text-n2f-accent-light">
                contact@node2flow.net
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
