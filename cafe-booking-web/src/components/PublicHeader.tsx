import { Link, NavLink } from 'react-router-dom';
import type { User } from '../types';
import { roleLabel } from '../lib/format';
import { Brand } from './Brand';

interface PublicHeaderProps {
  user: User | null;
  onAuth: () => void;
  onLogout: () => void;
}

export default function PublicHeader({ user, onAuth, onLogout }: PublicHeaderProps) {
  return (
    <header className="publicHeader">
      <Brand />
      <nav aria-label="Primary navigation">
        <Link to="/#spaces">Find a space</Link>
        <Link to="/#how-it-works">How it works</Link>
        {user?.role === 'customer' && <NavLink to="/owner/apply">For owners</NavLink>}
        {(user?.role === 'cafe_owner' || user?.role === 'admin') && (
          <NavLink to="/owner/cafes">Workspace console</NavLink>
        )}
        {user && user.role !== 'cafe_owner' && <NavLink to="/bookings">My bookings</NavLink>}
      </nav>
      <div className="headerActions">
        {user ? (
          <>
            <Link className="profileChip" to={user.role === 'customer' ? '/bookings' : '/owner/cafes'}>
              <span>{user.name.slice(0, 1).toUpperCase()}</span>
              <small>{roleLabel(user.role)}</small>
            </Link>
            <button className="textButton" onClick={onLogout}>Sign out</button>
          </>
        ) : (
          <button className="pillButton darkButton" onClick={onAuth}>Sign in <span>↗</span></button>
        )}
      </div>
    </header>
  );
}
