import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login, getOAuthProviders, getOAuthUrl } from '../lib/api';
import type { OAuthProvider } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Zap } from 'lucide-react';

// GitHub Icon
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

// Google Icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  // Fetch OAuth providers
  useEffect(() => {
    async function fetchProviders() {
      const response = await getOAuthProviders();
      if (response.success && response.data) {
        setProviders(response.data.providers);
      }
    }
    fetchProviders();
  }, []);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    if (!acceptedTerms) return;
    setError('');
    setOauthLoading(provider);

    const response = await getOAuthUrl(provider);

    if (response.success && response.data?.url) {
      window.location.href = response.data.url;
    } else {
      setError(response.error?.message || 'Failed to initiate OAuth');
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const registerResponse = await register(email, password);

    if (!registerResponse.success) {
      setError(registerResponse.error?.message || 'Registration failed');
      setLoading(false);
      return;
    }

    // Auto-login after registration
    const loginResponse = await login(email, password);

    if (loginResponse.success) {
      await refreshUser();
      navigate('/dashboard');
    } else {
      // Registration succeeded but login failed - redirect to login
      navigate('/login');
    }

    setLoading(false);
  };

  // Check if form should be disabled
  const formDisabled = !acceptedTerms;

  return (
    <div className="min-h-screen flex items-center justify-center bg-n2f-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="bg-n2f-accent p-3 rounded-xl">
              <Zap className="h-8 w-8 text-gray-900" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-n2f-text">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-n2f-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-n2f-accent hover:text-n2f-accent-light">
              Sign in
            </Link>
          </p>
        </div>

        {/* Terms checkbox - must accept first */}
        <div className="bg-n2f-card border border-n2f-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-n2f-border bg-n2f-elevated text-n2f-accent focus:ring-n2f-accent focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-n2f-text cursor-pointer">
              I agree to the{' '}
              <Link to="/terms" className="text-n2f-accent hover:text-n2f-accent-light">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-n2f-accent hover:text-n2f-accent-light">
                Privacy Policy
              </Link>
            </label>
          </div>
          {!acceptedTerms && (
            <p className="mt-2 text-xs text-n2f-text-muted">
              Please accept the terms to continue
            </p>
          )}
        </div>

        {/* OAuth Buttons */}
        {providers.length > 0 && (
          <div className={`space-y-3 ${formDisabled ? 'opacity-50' : ''}`}>
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleOAuthLogin(provider.id)}
                disabled={formDisabled || oauthLoading !== null}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-n2f-border rounded-lg shadow-sm bg-n2f-card hover:bg-n2f-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === provider.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-n2f-text-muted" />
                ) : provider.id === 'github' ? (
                  <GitHubIcon className="h-5 w-5 text-n2f-text" />
                ) : (
                  <GoogleIcon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium text-n2f-text">
                  Continue with {provider.name}
                </span>
              </button>
            ))}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-n2f-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-n2f-bg text-n2f-text-muted">Or register with email</span>
              </div>
            </div>
          </div>
        )}

        <form className={`mt-8 space-y-6 ${formDisabled ? 'opacity-50' : ''}`} onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={formDisabled}
                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={formDisabled}
                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-n2f-text-muted">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={formDisabled}
                className="input disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={formDisabled || loading || oauthLoading !== null}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
