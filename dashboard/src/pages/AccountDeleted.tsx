import { Link } from 'react-router-dom';
import { Zap, UserX, ArrowRight } from 'lucide-react';

export default function AccountDeleted() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-n2f-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="flex justify-center mb-6">
            <div className="bg-red-900/30 p-4 rounded-xl">
              <UserX className="h-12 w-12 text-red-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-n2f-text">
            Account Deleted
          </h1>
          <p className="text-n2f-text-secondary mt-3">
            Your account has been permanently deleted. All data, connections, and API keys have been removed.
          </p>
          <p className="text-n2f-text-muted text-sm mt-2">
            Previous data cannot be recovered.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/register"
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            Register New Account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/"
            className="block text-sm text-n2f-text-secondary hover:text-n2f-accent transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <div className="pt-4 border-t border-n2f-border">
          <div className="flex items-center justify-center gap-2 text-n2f-text-muted text-sm">
            <Zap className="h-4 w-4 text-n2f-accent" />
            <span>n8n MCP SaaS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
