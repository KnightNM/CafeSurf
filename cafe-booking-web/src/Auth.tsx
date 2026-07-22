import { useState } from 'react';
import AmbientScene from './AmbientScene';
import { supabase } from './supabase';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'confirmation';

interface AuthProps {
  initialMode?: AuthMode;
  onRecoveryComplete?: () => void;
}

export default function Auth({ initialMode = 'login', onRecoveryComplete }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      } else if (mode === 'signup') {
        if (name.trim().length < 2) throw new Error('Full name must be at least 2 characters');
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signupError) throw signupError;
        if (!data.session) setMode('confirmation');
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?auth=recovery`,
        });
        if (resetError) throw resetError;
        setNotice('Password reset instructions have been sent if that account exists.');
      } else if (mode === 'reset') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        await supabase.auth.signOut();
        window.history.replaceState({}, '', window.location.pathname);
        setNotice('Password updated. Sign in with your new password.');
        setMode('login');
        onRecoveryComplete?.();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  const isPasswordForm = mode === 'login' || mode === 'signup' || mode === 'reset';

  return (
    <div className="authContainer">
      <AmbientScene compact />
      <div className="authCard">
        <div className="authHeader">
          <span className="authBrand">CS</span>
          <div>
            <h1>CafeSurf</h1>
            <p>
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your customer account'}
              {mode === 'forgot' && 'Request a password reset'}
              {mode === 'reset' && 'Choose a new password'}
              {mode === 'confirmation' && 'Verify your email address'}
            </p>
          </div>
        </div>

        {error && <div className="authError"><span>{error}</span></div>}
        {notice && <div className="toast"><span>{notice}</span></div>}

        {mode === 'confirmation' ? (
          <div className="emptyState">
            <h3>Check your inbox</h3>
            <p>Open the confirmation link Supabase sent to {email}. Then return here to sign in.</p>
            <button className="primaryButton" onClick={() => switchMode('login')}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="authForm">
            {mode === 'signup' && (
              <label>
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your name"
                  minLength={2}
                  required
                />
              </label>
            )}

            {mode !== 'reset' && (
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </label>
            )}

            {isPasswordForm && (
              <label>
                {mode === 'reset' ? 'New password' : 'Password'}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'reset' ? 'Enter a new password' : 'Enter your password'}
                  required
                  minLength={8}
                />
              </label>
            )}

            <button type="submit" className="primaryButton" disabled={loading}>
              {loading ? 'Processing…' : (
                mode === 'login' ? 'Sign In'
                  : mode === 'signup' ? 'Create Account'
                    : mode === 'forgot' ? 'Send Reset Link'
                      : 'Update Password'
              )}
            </button>
          </form>
        )}

        {mode !== 'confirmation' && mode !== 'reset' && (
          <div className="authSwitch">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => switchMode('forgot')}>Forgot password?</button>
                <span>Don&apos;t have an account?</span>
                <button type="button" onClick={() => switchMode('signup')}>Sign Up</button>
              </>
            )}
            {(mode === 'signup' || mode === 'forgot') && (
              <button type="button" onClick={() => switchMode('login')}>Back to sign in</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
