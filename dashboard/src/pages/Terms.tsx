import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function Terms() {
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
        <h1 className="text-3xl font-bold text-n2f-text mb-8">Terms of Service</h1>

        <div className="space-y-8 text-n2f-text-secondary">
          <p className="text-sm text-n2f-text-muted">Last updated: February 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using n8n Management MCP ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">2. Description of Service</h2>
            <p>n8n Management MCP provides a Model Context Protocol (MCP) server that enables AI assistants to interact with your n8n automation platform. The Service includes API access, credential management, and usage tracking.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">3. User Responsibilities</h2>
            <p className="mb-3">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring your use complies with applicable laws</li>
              <li>The security of your connected n8n instances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">4. Usage Limits</h2>
            <p>The Service has usage limits based on your plan. Free accounts have limited daily requests. Exceeding limits may result in temporary service restrictions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">5. Prohibited Uses</h2>
            <p className="mb-3">You may not use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit malicious code or interfere with the Service</li>
              <li>Attempt to gain unauthorized access to other systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">6. Service Availability</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or error-free operation. We reserve the right to modify or discontinue the Service at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">8. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify users of significant changes. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">9. Contact</h2>
            <p>For questions about these Terms, please contact us at{' '}
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
