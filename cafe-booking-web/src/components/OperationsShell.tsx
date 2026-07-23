import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { roleLabel } from '../lib/format';
import { Brand } from './Brand';

export default function OperationsShell({
  user,
  children,
  onLogout,
}: {
  user: User;
  children: ReactNode;
  onLogout: () => void;
}) {
  return (
    <div className="operationsShell">
      <aside className="operationsRail">
        <Brand compact />
        <p className="railLabel">Workspace console</p>
        <nav aria-label="Workspace navigation">
          <NavLink to="/">Public site</NavLink>
          {(user.role === 'cafe_owner' || user.role === 'admin') && (
            <NavLink to="/owner/cafes">{user.role === 'admin' ? 'All spaces' : 'My spaces'}</NavLink>
          )}
          {user.role === 'customer' && <NavLink to="/owner/apply">Become an owner</NavLink>}
          {user.role === 'admin' && (
            <>
              <NavLink to="/admin/cafe-revisions">Café approvals</NavLink>
              <NavLink to="/admin/owner-applications">Owner applications</NavLink>
            </>
          )}
        </nav>
        <div className="railUser">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></div>
          <button onClick={onLogout} aria-label="Sign out">↗</button>
        </div>
      </aside>
      <main className="operationsMain">{children}</main>
    </div>
  );
}
