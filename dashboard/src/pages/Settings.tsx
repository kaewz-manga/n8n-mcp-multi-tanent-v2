import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSudoContext } from '../contexts/SudoContext';
import {
  changePassword,
  deleteAccount,
  forceDeleteAccount,
  updateSessionDuration,
  setupTOTP,
  enableTOTP,
  disableTOTP,
  getTOTPStatus,
  exportUserData,
  recoverAccount,
  clearToken,
  type TOTPSetupData,
} from '../lib/api';
import { User, Mail, Shield, Trash2, Loader2, Check, AlertCircle, X, Clock, Smartphone, QrCode, Copy, CheckCircle, Download, FileJson, FileSpreadsheet, RotateCcw } from 'lucide-react';

const SESSION_OPTIONS = [
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '24 hours' },
  { value: 604800, label: '7 days' },
  { value: 2592000, label: '30 days' },
];

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const { withSudo, totpEnabled: contextTotpEnabled } = useSudoContext();

  // TOTP state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<TOTPSetupData | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpSuccess, setTotpSuccess] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Session duration state
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Data export state
  const [exportLoading, setExportLoading] = useState<'json' | 'csv' | null>(null);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  // Account recovery state
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState('');

  // Force delete state
  const [showForceDelete, setShowForceDelete] = useState(false);
  const [forceDeletePassword, setForceDeletePassword] = useState('');
  const [forceDeleteConfirmText, setForceDeleteConfirmText] = useState('');
  const [forceDeleteLoading, setForceDeleteLoading] = useState(false);
  const [forceDeleteError, setForceDeleteError] = useState('');

  const navigate = useNavigate();

  const isOAuthUser = !!user?.oauth_provider;
  const isPendingDeletion = user?.status === 'pending_deletion';
  const scheduledDeletionAt = (user as any)?.scheduled_deletion_at;

  // Load TOTP status on mount
  useEffect(() => {
    loadTOTPStatus();
  }, []);

  // Sync with context
  useEffect(() => {
    setTotpEnabled(contextTotpEnabled);
  }, [contextTotpEnabled]);

  const loadTOTPStatus = async () => {
    const res = await getTOTPStatus();
    if (res.success && res.data) {
      setTotpEnabled(res.data.enabled);
    }
  };

  const handleSetupTOTP = async () => {
    setTotpLoading(true);
    setTotpError('');

    const res = await setupTOTP();
    setTotpLoading(false);

    if (res.success && res.data) {
      setTotpSetupData(res.data);
    } else {
      setTotpError(res.error?.message || 'Failed to start TOTP setup');
    }
  };

  const handleEnableTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      setTotpError('Please enter a 6-digit code');
      return;
    }

    setTotpLoading(true);
    setTotpError('');

    const res = await enableTOTP(totpCode);
    setTotpLoading(false);

    if (res.success) {
      setTotpSuccess('Two-factor authentication enabled successfully!');
      setTotpSetupData(null);
      setTotpCode('');
      setTotpEnabled(true);
      setTimeout(() => setTotpSuccess(''), 3000);
    } else {
      setTotpError(res.error?.message || 'Invalid code. Please try again.');
    }
  };

  const handleDisableTOTP = async () => {
    setTotpLoading(true);
    setTotpError('');

    const res = await disableTOTP(isOAuthUser ? undefined : disablePassword);
    setTotpLoading(false);

    if (res.success) {
      setTotpSuccess('Two-factor authentication disabled');
      setTotpEnabled(false);
      setShowDisableConfirm(false);
      setDisablePassword('');
      setTimeout(() => setTotpSuccess(''), 3000);
    } else {
      setTotpError(res.error?.message || 'Failed to disable TOTP');
    }
  };

  const handleCopySecret = () => {
    if (totpSetupData?.secret) {
      navigator.clipboard.writeText(totpSetupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const handleSessionDurationChange = async (seconds: number) => {
    setSessionError('');
    setSessionSuccess(false);
    setSessionLoading(true);

    const res = await updateSessionDuration(seconds);
    setSessionLoading(false);

    if (res.success) {
      setSessionSuccess(true);
      await refreshUser();
      setTimeout(() => setSessionSuccess(false), 2000);
    } else {
      setSessionError(res.error?.message || 'Failed to update session duration');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    await withSudo(async () => {
      setPasswordLoading(true);
      const res = await changePassword(currentPassword, newPassword);
      setPasswordLoading(false);

      if (res.success) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        setPasswordError(res.error?.message || 'Failed to change password');
      }
    });
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);

    // OAuth users: just need to type "delete" - no TOTP required
    if (isOAuthUser) {
      if (deleteConfirmText.toLowerCase() !== 'delete') {
        setDeleteError('Please type "delete" to confirm');
        setDeleteLoading(false);
        return;
      }

      const res = await deleteAccount(undefined, true);
      setDeleteLoading(false);

      if (res.success) {
        setShowDeleteConfirm(false);
        await refreshUser();
      } else {
        setDeleteError(res.error?.message || 'Failed to delete account');
      }
      return;
    }

    // Email/password users: require TOTP + password
    await withSudo(async () => {
      const res = await deleteAccount(deletePassword, undefined);
      setDeleteLoading(false);

      if (res.success) {
        setShowDeleteConfirm(false);
        await refreshUser();
      } else {
        setDeleteError(res.error?.message || 'Failed to delete account');
      }
    });
  };

  const handleForceDelete = async () => {
    setForceDeleteError('');
    setForceDeleteLoading(true);

    if (isOAuthUser) {
      if (forceDeleteConfirmText.toLowerCase() !== 'delete') {
        setForceDeleteError('Please type "delete" to confirm');
        setForceDeleteLoading(false);
        return;
      }

      const res = await forceDeleteAccount(undefined, true);
      setForceDeleteLoading(false);

      if (res.success) {
        clearToken();
        navigate('/account-deleted');
      } else {
        setForceDeleteError(res.error?.message || 'Failed to delete account');
      }
      return;
    }

    const res = await forceDeleteAccount(forceDeletePassword, undefined);
    setForceDeleteLoading(false);

    if (res.success) {
      clearToken();
      navigate('/account-deleted');
    } else {
      setForceDeleteError(res.error?.message || 'Failed to delete account');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExportLoading(format);
    setExportError('');
    setExportSuccess('');

    try {
      const blob = await exportUserData(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `n8n-mcp-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Data exported as ${format.toUpperCase()} successfully!`);
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExportLoading(null);
    }
  };

  const handleRecoverAccount = async () => {
    setRecoverLoading(true);
    setRecoverError('');

    try {
      const res = await recoverAccount();
      if (res.success) {
        await refreshUser();
      } else {
        setRecoverError(res.error?.message || 'Failed to recover account');
      }
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : 'Failed to recover account');
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Settings</h1>
        <p className="text-n2f-text-secondary mt-1">Manage your account settings</p>
      </div>

      {/* Account Recovery Banner */}
      {isPendingDeletion && scheduledDeletionAt && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-300">Account Scheduled for Deletion</h3>
              <p className="text-sm text-amber-200/80 mt-1">
                Your account is scheduled to be permanently deleted on{' '}
                <strong>{new Date(scheduledDeletionAt).toLocaleDateString()}</strong>.
                All your data, connections, and API keys will be removed.
              </p>
              {recoverError && (
                <div className="text-red-400 text-sm mt-2">{recoverError}</div>
              )}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleRecoverAccount}
                  disabled={recoverLoading}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {recoverLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Cancel Deletion & Recover Account
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowForceDelete(true)}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Force Delete Now
                </button>
              </div>

              {/* Force Delete Confirmation */}
              {showForceDelete && (
                <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
                  <p className="text-sm text-red-300 mb-3">
                    This will <strong>permanently delete</strong> your account immediately. All data, connections, and API keys will be removed and cannot be recovered.
                  </p>

                  {forceDeleteError && (
                    <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {forceDeleteError}
                    </div>
                  )}

                  {isOAuthUser ? (
                    <div className="mb-3">
                      <label className="label text-red-300">Type "delete" to confirm</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="delete"
                        value={forceDeleteConfirmText}
                        onChange={(e) => setForceDeleteConfirmText(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="label text-red-300">Enter your password to confirm</label>
                      <input
                        type="password"
                        className="input"
                        placeholder="Your password"
                        value={forceDeletePassword}
                        onChange={(e) => setForceDeletePassword(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowForceDelete(false);
                        setForceDeletePassword('');
                        setForceDeleteConfirmText('');
                        setForceDeleteError('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleForceDelete}
                      disabled={forceDeleteLoading || (isOAuthUser ? forceDeleteConfirmText.toLowerCase() !== 'delete' : !forceDeletePassword)}
                      className="btn-danger"
                    >
                      {forceDeleteLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Permanently Delete Account'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-n2f-accent/10 rounded-lg">
            <User className="h-5 w-5 text-n2f-accent" />
          </div>
          <h2 className="text-lg font-semibold text-n2f-text">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-n2f-text-muted" />
              <span className="text-n2f-text">{user?.email}</span>
            </div>
          </div>

          <div>
            <label className="label">Account Status</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 capitalize">
              {user?.status}
            </span>
          </div>

          <div>
            <label className="label">Current Plan</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-n2f-accent/10 text-n2f-accent capitalize">
              {user?.plan}
            </span>
          </div>

          {isOAuthUser && (
            <div>
              <label className="label">Login Method</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 capitalize">
                {user?.oauth_provider}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-900/30 rounded-lg">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-n2f-text">Security</h2>
        </div>

        <div className="space-y-6">
          {/* Two-Factor Authentication */}
          <div>
            <label className="label flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-n2f-text-muted" />
              Two-Factor Authentication (2FA)
            </label>
            <p className="text-sm text-n2f-text-secondary mb-3">
              Add an extra layer of security using an authenticator app like Google Authenticator or Authy
            </p>

            {totpSuccess && (
              <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-400 px-3 py-2 rounded-lg text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {totpSuccess}
              </div>
            )}

            {totpError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {totpError}
              </div>
            )}

            {totpEnabled ? (
              // TOTP is enabled - show disable option
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400">
                    <Check className="h-3 w-3 mr-1" />
                    Enabled
                  </span>
                </div>

                {!showDisableConfirm ? (
                  <button
                    onClick={() => setShowDisableConfirm(true)}
                    className="btn-secondary text-red-400 border-red-700 hover:bg-red-900/30"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                    <p className="text-sm text-red-300 mb-3">
                      Are you sure you want to disable two-factor authentication? This will make your account less secure.
                    </p>

                    {!isOAuthUser && (
                      <div className="mb-3">
                        <label className="label text-red-300">Enter your password to confirm</label>
                        <input
                          type="password"
                          className="input"
                          placeholder="Your password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDisableConfirm(false);
                          setDisablePassword('');
                          setTotpError('');
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDisableTOTP}
                        disabled={totpLoading || (!isOAuthUser && !disablePassword)}
                        className="btn-danger"
                      >
                        {totpLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disabling...
                          </>
                        ) : (
                          'Disable 2FA'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : totpSetupData ? (
              // TOTP setup in progress - show QR code and verification
              <div className="bg-n2f-elevated border border-n2f-border rounded-lg p-4">
                <div className="text-center mb-4">
                  <div className="bg-white p-4 rounded-lg inline-block mb-3">
                    <img
                      src={totpSetupData.qr_code_url}
                      alt="TOTP QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-n2f-text-secondary">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <div className="mb-4">
                  <label className="label">Or enter this code manually:</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black px-3 py-2 rounded font-mono text-sm text-n2f-text break-all">
                      {totpSetupData.secret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="btn-secondary p-2"
                      title="Copy secret"
                    >
                      {secretCopied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleEnableTOTP}>
                  <label className="label">Enter the 6-digit code from your app:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="\d{6}"
                      className="input flex-1 text-center font-mono text-lg tracking-widest"
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <button
                      type="submit"
                      disabled={totpLoading || totpCode.length !== 6}
                      className="btn-primary"
                    >
                      {totpLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </button>
                  </div>
                </form>

                <button
                  onClick={() => {
                    setTotpSetupData(null);
                    setTotpCode('');
                    setTotpError('');
                  }}
                  className="text-sm text-n2f-text-muted hover:text-n2f-text mt-3"
                >
                  Cancel setup
                </button>
              </div>
            ) : (
              // TOTP not enabled - show setup button
              <button
                onClick={handleSetupTOTP}
                disabled={totpLoading}
                className="btn-primary"
              >
                {totpLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </>
                )}
              </button>
            )}
          </div>

          {/* Password */}
          {!isOAuthUser && (
            <div className="pt-4 border-t border-n2f-border">
              <label className="label">Password</label>
              <p className="text-sm text-n2f-text-secondary mb-2">
                Change your password to keep your account secure
              </p>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="btn-secondary"
              >
                Change Password
              </button>
            </div>
          )}

          {isOAuthUser && (
            <div className="pt-4 border-t border-n2f-border">
              <label className="label">Password</label>
              <p className="text-sm text-n2f-text-secondary">
                You signed in with {user?.oauth_provider}. Password management is handled by your OAuth provider.
              </p>
            </div>
          )}

          {/* Session Duration */}
          <div className="pt-4 border-t border-n2f-border">
            <label className="label flex items-center gap-2">
              <Clock className="h-4 w-4 text-n2f-text-muted" />
              Session Duration
            </label>
            <p className="text-sm text-n2f-text-secondary mb-2">
              How long you stay logged in before needing to sign in again
            </p>

            {sessionError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {sessionError}
              </div>
            )}

            {sessionSuccess && (
              <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-400 px-3 py-2 rounded-lg text-sm mb-2 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Session duration updated
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                className="input w-48"
                value={user?.session_duration_seconds || 86400}
                onChange={(e) => handleSessionDurationChange(Number(e.target.value))}
                disabled={sessionLoading}
              >
                {SESSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {sessionLoading && <Loader2 className="h-4 w-4 animate-spin text-n2f-text-muted" />}
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t border-n2f-border">
            <label className="label">Active Sessions</label>
            <p className="text-sm text-n2f-text-secondary mb-2">
              Sign out of all other sessions
            </p>
            <button onClick={logout} className="btn-secondary">
              Sign Out Everywhere
            </button>
          </div>
        </div>
      </div>

      {/* MCP Configuration Help */}
      <div className="card">
        <h2 className="text-lg font-semibold text-n2f-text mb-4">
          MCP Client Configuration
        </h2>
        <p className="text-sm text-n2f-text-secondary mb-4">
          Use this configuration in your MCP client (Claude Desktop, Cursor, etc.)
        </p>

        <div className="bg-black rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
{`{
  "mcpServers": {
    "n8n": {
      "url": "${import.meta.env.VITE_API_URL || 'https://your-api.workers.dev'}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
          </pre>
        </div>

        <p className="text-xs text-n2f-text-secondary mt-3">
          Replace YOUR_API_KEY with the API key from your connection.
        </p>
      </div>

      {/* Data Export Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-900/30 rounded-lg">
            <Download className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-n2f-text">Export Your Data</h2>
        </div>

        <p className="text-sm text-n2f-text-secondary mb-4">
          Download a copy of your data for backup or data portability purposes (GDPR compliant).
          This includes your profile, connections, API keys metadata, usage history, and integrations.
        </p>

        {exportSuccess && (
          <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-400 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {exportSuccess}
          </div>
        )}

        {exportError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {exportError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exportLoading !== null}
            className="btn-secondary inline-flex items-center gap-2"
          >
            {exportLoading === 'json' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileJson className="h-4 w-4" />
            )}
            Export as JSON
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading !== null}
            className="btn-secondary inline-flex items-center gap-2"
          >
            {exportLoading === 'csv' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Export Usage Logs as CSV
          </button>
        </div>

        <p className="text-xs text-n2f-text-muted mt-3">
          Note: Encrypted credentials and API key secrets are not included in exports for security.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-900/30 rounded-lg">
            <Trash2 className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-300">Danger Zone</h2>
        </div>

        <p className="text-sm text-n2f-text-secondary mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-sm text-red-300 mb-4">
              Are you sure you want to delete your account? This action cannot be
              undone. All your data, connections, and API keys will be permanently
              deleted.
            </p>

            {deleteError && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {deleteError}
              </div>
            )}

            {isOAuthUser ? (
              <div className="mb-4">
                <label className="label text-red-300">Type "delete" to confirm</label>
                <input
                  type="text"
                  className="input"
                  placeholder="delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="label text-red-300">Enter your password to confirm</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || (isOAuthUser ? deleteConfirmText.toLowerCase() !== 'delete' : !deletePassword)}
                className="btn-danger"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete My Account'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-n2f-elevated rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-n2f-border">
              <h2 className="text-lg font-semibold text-n2f-text">
                Change Password
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="p-1 text-n2f-text-muted hover:text-n2f-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-6 text-center">
                <div className="bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium text-n2f-text">Password Updated!</h3>
                <p className="text-n2f-text-secondary mt-1">Your password has been changed successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="p-4 space-y-4">
                {passwordError && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-n2f-text-secondary mt-1">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordError('');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn-primary flex-1"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
