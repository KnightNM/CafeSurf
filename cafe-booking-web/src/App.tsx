import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminOwnerApplications from './AdminOwnerApplications';
import AdminCafeRevisions from './AdminCafeRevisions';
import Auth, { type AuthMode } from './Auth';
import CafeOwnerDashboard from './CafeOwnerDashboard';
import OperationsShell from './components/OperationsShell';
import HashScrollManager from './components/HashScrollManager';
import OwnerApplicationView from './OwnerApplicationView';
import BookingsPage from './pages/BookingsPage';
import HomePage from './pages/HomePage';
import SpacePage from './pages/SpacePage';
import { getCurrentUser } from './api';
import { supabase } from './supabase';
import type { BookingIntent, User, UserRole } from './types';

function readIntent(): BookingIntent | null {
  try {
    const raw = sessionStorage.getItem('cafesurf-booking-intent');
    return raw ? JSON.parse(raw) as BookingIntent : null;
  } catch {
    return null;
  }
}

function RequireRole({
  ready,
  user,
  roles,
  onMissingAuth,
  children,
}: {
  ready: boolean;
  user: User | null;
  roles: UserRole[];
  onMissingAuth: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (ready && !user) onMissingAuth();
  }, [ready, user, onMissingAuth]);

  if (!ready) return <div className="pageLoading">Loading your workspace…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [pendingIntent, setPendingIntentState] = useState<BookingIntent | null>(readIntent);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function applySession(session: Session | null) {
      if (!active) return;
      if (!session) {
        setToken(null);
        setUser(null);
        setAuthReady(true);
        return;
      }
      setToken(session.access_token);
      try {
        const profile = await getCurrentUser(session.access_token);
        if (!active) return;
        setUser(profile);
        setProfileError(null);
      } catch (caught) {
        if (!active) return;
        setUser(null);
        setProfileError(caught instanceof Error ? caught.message : 'Could not load your profile');
      } finally {
        if (active) setAuthReady(true);
      }
    }

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/auth/recovery');
      window.setTimeout(() => void applySession(session), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  function setPendingIntent(intent: BookingIntent | null) {
    setPendingIntentState(intent);
    if (intent) sessionStorage.setItem('cafesurf-booking-intent', JSON.stringify(intent));
    else sessionStorage.removeItem('cafesurf-booking-intent');
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    navigate('/');
  }

  async function refreshProfile() {
    if (!token) return;
    setUser(await getCurrentUser(token));
  }

  const openAuth = () => setAuthMode('login');
  const operations = (content: ReactNode) => user
    ? <OperationsShell user={user} onLogout={() => void logout()}>{content}</OperationsShell>
    : content;

  if (!authReady) {
    return <div className="pageLoading brandedLoading"><span className="loadingMark">CS</span>Restoring your session…</div>;
  }

  return (
    <>
      <HashScrollManager />
      {profileError && <div className="globalError" role="alert">{profileError}</div>}
      <Routes>
        <Route path="/" element={<HomePage user={user} token={token} onAuth={openAuth} onLogout={() => void logout()} />} />
        <Route path="/spaces/:id" element={
          <SpacePage
            user={user}
            token={token}
            pendingIntent={pendingIntent}
            onIntentChange={setPendingIntent}
            onAuth={openAuth}
            onLogout={() => void logout()}
          />
        } />
        <Route path="/bookings" element={
          <RequireRole ready={authReady} user={user} roles={['customer', 'admin']} onMissingAuth={openAuth}>
            {user && token
              ? <BookingsPage user={user} token={token} onAuth={openAuth} onLogout={() => void logout()} />
              : null}
          </RequireRole>
        } />
        <Route path="/owner/apply" element={
          <RequireRole ready={authReady} user={user} roles={['customer']} onMissingAuth={openAuth}>
            {user && token ? operations(
              <OwnerApplicationView token={token} currentRole={user.role} onProfileChanged={() => void refreshProfile()} />
            ) : null}
          </RequireRole>
        } />
        {['/owner/cafes', '/owner/cafes/new', '/owner/cafes/:id/edit', '/owner/cafes/:id/bookings', '/owner/revisions/:revisionId/edit'].map((path) => (
          <Route path={path} key={path} element={
            <RequireRole ready={authReady} user={user} roles={['cafe_owner', 'admin']} onMissingAuth={openAuth}>
              {user && token ? operations(<CafeOwnerDashboard token={token} userRole={user.role} />) : null}
            </RequireRole>
          } />
        ))}
        <Route path="/admin/owner-applications" element={
          <RequireRole ready={authReady} user={user} roles={['admin']} onMissingAuth={openAuth}>
            {user && token ? operations(<AdminOwnerApplications token={token} />) : null}
          </RequireRole>
        } />
        <Route path="/admin/cafe-revisions" element={
          <RequireRole ready={authReady} user={user} roles={['admin']} onMissingAuth={openAuth}>
            {user && token ? operations(<AdminCafeRevisions token={token} />) : null}
          </RequireRole>
        } />
        <Route path="/auth/recovery" element={
          <Auth
            initialMode="reset"
            onRecoveryComplete={() => navigate('/')}
            onAuthenticated={() => navigate('/')}
          />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {authMode && (
        <Auth
          modal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthenticated={() => setAuthMode(null)}
        />
      )}
    </>
  );
}
