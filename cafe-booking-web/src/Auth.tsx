import { useEffect, useRef, useState } from 'react';
import { Brand } from './components/Brand';
import { supabase } from './supabase';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'confirmation';

interface AuthProps {
  initialMode?: AuthMode;
  modal?: boolean;
  onClose?: () => void;
  onAuthenticated?: () => void;
  onRecoveryComplete?: () => void;
}

export default function Auth({
  initialMode = 'login',
  modal = false,
  onClose,
  onAuthenticated,
  onRecoveryComplete,
}: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMode(initialMode), [initialMode]);

  useEffect(() => {
    if (!modal) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('input, button')?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [modal, onClose]);

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
        onAuthenticated?.();
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
        else onAuthenticated?.();
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/recovery`,
        });
        if (resetError) throw resetError;
        setNotice('If that account exists, a secure reset link is on its way.');
      } else if (mode === 'reset') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        await supabase.auth.signOut();
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
  const content = (
    <section
      className="authPanel"
      ref={panelRef}
      role={modal ? 'dialog' : undefined}
      aria-modal={modal || undefined}
      aria-labelledby="auth-title"
    >
      {modal && <button className="modalClose" onClick={onClose} aria-label="Close sign in">×</button>}
      <Brand />
      <div className="authIntro">
        <p className="kicker">TEAM WORKSPACES, ON YOUR TIME</p>
        <h1 id="auth-title">
          {mode === 'login' && 'Welcome back.'}
          {mode === 'signup' && 'Build your next session.'}
          {mode === 'forgot' && 'Reset your access.'}
          {mode === 'reset' && 'Choose a new password.'}
          {mode === 'confirmation' && 'Check your inbox.'}
        </h1>
        <p>
          {mode === 'login' && 'Sign in to book spaces and keep your team plans together.'}
          {mode === 'signup' && 'Create a customer account to reserve flexible workspace.'}
          {mode === 'forgot' && 'We will send a secure password-reset link.'}
          {mode === 'reset' && 'Use at least eight characters for your new password.'}
          {mode === 'confirmation' && `Open the confirmation link sent to ${email}.`}
        </p>
      </div>

      {error && <div className="notice noticeError" role="alert">{error}</div>}
      {notice && <div className="notice" role="status">{notice}</div>}

      {mode === 'confirmation' ? (
        <button className="pillButton darkButton" onClick={() => switchMode('login')}>
          Back to sign in
        </button>
      ) : (
        <form className="formStack" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>Full name
              <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required />
            </label>
          )}
          {mode !== 'reset' && (
            <label>Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
          )}
          {isPasswordForm && (
            <label>{mode === 'reset' ? 'New password' : 'Password'}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
          )}
          <button className="pillButton darkButton fullButton" disabled={loading}>
            {loading ? 'Working…' : mode === 'login' ? 'Sign in'
              : mode === 'signup' ? 'Create account'
                : mode === 'forgot' ? 'Send reset link' : 'Update password'}
          </button>
        </form>
      )}

      {mode !== 'confirmation' && mode !== 'reset' && (
        <div className="authSwitch">
          {mode === 'login' ? (
            <>
              <button onClick={() => switchMode('forgot')}>Forgot password?</button>
              <span>New to CafeSurf?</span>
              <button onClick={() => switchMode('signup')}>Create an account</button>
            </>
          ) : (
            <button onClick={() => switchMode('login')}>Back to sign in</button>
          )}
        </div>
      )}
    </section>
  );

  if (modal) {
    return <div className="authOverlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>{content}</div>;
  }
  return <main className="authPage"><div className="authBackdrop" />{content}</main>;
}
