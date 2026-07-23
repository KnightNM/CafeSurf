import { useEffect, useMemo, useState } from 'react';
import { cancelBooking, checkInBooking, fetchMyBookings } from '../api';
import PublicHeader from '../components/PublicHeader';
import { hourLabel, todayString } from '../lib/format';
import type { BookingWithCafe, User } from '../types';

function upcoming(booking: BookingWithCafe): boolean {
  return booking.date >= todayString()
    && ['pending', 'confirmed', 'checked_in'].includes(booking.status);
}

export default function BookingsPage({
  user,
  token,
  onAuth,
  onLogout,
}: {
  user: User;
  token: string;
  onAuth: () => void;
  onLogout: () => void;
}) {
  const [bookings, setBookings] = useState<BookingWithCafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setBookings(await fetchMyBookings(token));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [token]);

  const groups = useMemo(() => ({
    upcoming: bookings.filter(upcoming),
    past: bookings.filter((booking) => !upcoming(booking)),
  }), [bookings]);

  async function cancel(id: string) {
    try {
      await cancelBooking(id, token);
      setMessage('Booking cancelled.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel booking');
    }
  }

  async function checkIn(id: string) {
    try {
      await checkInBooking(id, token);
      setMessage('Check-in complete.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not check in');
    }
  }

  function BookingGroup({ title, items }: { title: string; items: BookingWithCafe[] }) {
    return (
      <section className="bookingGroup">
        <div className="groupTitle"><h2>{title}</h2><span>{items.length}</span></div>
        {!items.length ? <div className="emptyPanel"><strong>Nothing here yet.</strong><span>Your sessions will appear here.</span></div> : (
          <div className="bookingCards">
            {items.map((booking) => (
              <article className="bookingCard" key={booking.id}>
                <div className="bookingDate"><strong>{booking.date.slice(8, 10)}</strong><span>{booking.date.slice(0, 7)}</span></div>
                <div><p className="kicker">{booking.cafe_area}</p><h3>{booking.cafe_name}</h3><p>{hourLabel(booking.start_time)}–{hourLabel(booking.end_time)}</p></div>
                <dl>
                  <div><dt>Team</dt><dd>{booking.team_size} {booking.team_size === 1 ? 'person' : 'people'}</dd></div>
                  <div><dt>Total</dt><dd>LKR {booking.total_price.toLocaleString()}</dd></div>
                  <div><dt>Status</dt><dd><span className={`statusPill ${booking.status}`}>{booking.status.replace('_', ' ')}</span></dd></div>
                </dl>
                <div className="cardActions">
                  {booking.status === 'confirmed' && <button className="pillButton darkButton" onClick={() => void checkIn(booking.id)}>Check in</button>}
                  {['pending', 'confirmed'].includes(booking.status) && <button className="textButton dangerText" onClick={() => void cancel(booking.id)}>Cancel</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="publicPage">
      <PublicHeader user={user} onAuth={onAuth} onLogout={onLogout} />
      <main className="bookingsPage">
        <header className="pageTitle">
          <p className="kicker">{user.name.toUpperCase()}</p>
          <h1>Your team sessions.</h1>
          <button className="textButton" onClick={() => void load()}>Refresh ↻</button>
        </header>
        {(error || message) && <div className={`notice ${error ? 'noticeError' : ''}`}>{error ?? message}</div>}
        {loading ? <div className="pageLoading">Loading your sessions…</div> : (
          <>
            <BookingGroup title="Upcoming" items={groups.upcoming} />
            <BookingGroup title="Past and inactive" items={groups.past} />
          </>
        )}
      </main>
    </div>
  );
}
