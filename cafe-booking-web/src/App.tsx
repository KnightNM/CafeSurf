import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  cancelBooking,
  checkInBooking,
  createBooking,
  fetchAvailability,
  fetchCafes,
  fetchMyBookings,
  getCurrentUser,
} from './api';
import type { AvailabilitySlot, Booking, BookingWithCafe, Cafe, User } from './types';
import Auth from './Auth';
import CafeOwnerDashboard from './CafeOwnerDashboard';
import AmbientScene from './AmbientScene';
import OwnerApplicationView from './OwnerApplicationView';
import AdminOwnerApplications from './AdminOwnerApplications';
import { supabase } from './supabase';

const areaFilters = ['All', 'Colombo 03', 'Colombo 07', 'Nawala', 'Rajagiriya', 'Kandy'];

const cafeImages = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function hourLabel(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const display = normalized % 12 || 12;
  return `${display}:00 ${suffix}`;
}

function isUpcomingBooking(booking: BookingWithCafe) {
  const active = booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'checked_in';
  return booking.date >= todayString() && active;
}

function imageForCafe(cafe: Cafe) {
  const seed = cafe.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return cafeImages[seed % cafeImages.length];
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(
    new URLSearchParams(window.location.search).get('auth') === 'recovery'
  );
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [selectedArea, setSelectedArea] = useState('All');
  const [generatorOnly, setGeneratorOnly] = useState(false);
  const [fastWifiOnly, setFastWifiOnly] = useState(false);
  const [date, setDate] = useState(todayString());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [bookings, setBookings] = useState<BookingWithCafe[]>([]);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [view, setView] = useState<
    'explore' | 'bookings' | 'mycafes' | 'owner-application' | 'applications'
  >('explore');
  const [loadingCafes, setLoadingCafes] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingNow, setBookingNow] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCustomer = user?.role === 'customer';
  const isOwner = user?.role === 'cafe_owner';
  const isAdmin = user?.role === 'admin';
  const canBookCafes = isCustomer || isAdmin;
  const canManageCafes = isOwner || isAdmin;

  const selectedRange = useMemo(() => {
    if (!selectedHours.length) return null;
    const sorted = [...selectedHours].sort((a, b) => a - b);
    return { start: sorted[0], end: sorted[sorted.length - 1] + 1 };
  }, [selectedHours]);

  const totalPrice = selectedCafe && selectedRange
    ? (selectedRange.end - selectedRange.start) * selectedCafe.hourly_rate
    : 0;

  const upcomingBookings = bookings.filter(isUpcomingBooking);
  const pastBookings = bookings.filter((booking) => !isUpcomingBooking(booking));

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    setView('explore');
  }

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
        setView((current) => {
          if (profile.role === 'cafe_owner') return 'mycafes';
          return current;
        });
        setError(null);
      } catch (caught) {
        if (!active) return;
        setUser(null);
        setError(caught instanceof Error ? caught.message : 'Could not load your profile');
      } finally {
        if (active) setAuthReady(true);
      }
    }

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setAuthReady(true);
      }
      window.setTimeout(() => void applySession(session), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (!token) return;
    const profile = await getCurrentUser(token);
    setUser(profile);
    if (profile.role === 'cafe_owner') setView('mycafes');
  }

  useEffect(() => {
    if (canBookCafes) {
      void loadCafes();
    }
  }, [selectedArea, generatorOnly, fastWifiOnly, canBookCafes]);

  useEffect(() => {
    if (user && canBookCafes) {
      void loadBookings();
    }
  }, [user, canBookCafes]);

  useEffect(() => {
    if (!selectedCafe || !canBookCafes) return;
    void loadAvailabilityForCafe(selectedCafe.id, date);
  }, [selectedCafe, date, canBookCafes]);

  async function loadCafes() {
    setLoadingCafes(true);
    setError(null);
    try {
      const data = await fetchCafes({
        area: selectedArea === 'All' ? undefined : selectedArea,
        hasGenerator: generatorOnly ? true : undefined,
        minWifiSpeed: fastWifiOnly ? 100 : undefined,
      });
      setCafes(data);
      if (selectedCafe && !data.some((cafe) => cafe.id === selectedCafe.id)) {
        setSelectedCafe(data[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cafes');
    } finally {
      setLoadingCafes(false);
    }
  }

  async function loadAvailabilityForCafe(cafeId: string, bookingDate: string) {
    setLoadingSlots(true);
    setSelectedHours([]);
    setError(null);
    try {
      setSlots(await fetchAvailability(cafeId, bookingDate));
    } catch (err) {
      setSlots([]);
      setError(err instanceof Error ? err.message : 'Could not load availability');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function loadBookings() {
    if (!token) return;
    try {
      setBookings(await fetchMyBookings(token));
    } catch {
      setBookings([]);
    }
  }

  function toggleHour(hour: number) {
    const slot = slots.find((item) => item.hour === hour);
    if (!slot || slot.available <= 0) return;

    setSelectedHours((current) => {
      if (current.includes(hour)) {
        return largestContiguousBlock(current.filter((item) => item !== hour));
      }

      if (!current.length) return [hour];
      const sorted = [...current].sort((a, b) => a - b);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (hour === first - 1 || hour === last + 1) return [...current, hour];
      return [hour];
    });
  }

  async function submitBooking() {
    if (!selectedCafe || !selectedRange || !token) return;
    setBookingNow(true);
    setError(null);
    setNotice(null);
    try {
      const booking = await createBooking(
        {
          cafe_id: selectedCafe.id,
          date,
          start_time: selectedRange.start,
          end_time: selectedRange.end,
        },
        token
      );
      setLatestBooking(booking);
      setNotice(`Requested ${selectedCafe.name} for ${hourLabel(booking.start_time)} to ${hourLabel(booking.end_time)}.`);
      setSelectedHours([]);
      await loadAvailabilityForCafe(selectedCafe.id, date);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create booking');
    } finally {
      setBookingNow(false);
    }
  }

  async function cancelExistingBooking(id: string) {
    if (!token) return;
    setError(null);
    try {
      const updated = await cancelBooking(id, token);
      setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)));
      setNotice('Booking cancelled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel booking');
    }
  }

  async function checkInLatestBooking() {
    if (!latestBooking || !token) return;
    setError(null);
    try {
      const updated = await checkInBooking(latestBooking.id, token);
      setLatestBooking(updated);
      setNotice('Check-in confirmed.');
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check in');
    }
  }

  if (!authReady) {
    return <div className="authContainer"><div className="authCard">Loading your session…</div></div>;
  }

  if (passwordRecovery) {
    return <Auth initialMode="reset" onRecoveryComplete={() => setPasswordRecovery(false)} />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <main className="appShell">
      <AmbientScene />
      <aside className="sidebar" aria-label="CafeSurf navigation">
        <div className="brandBlock">
          <span className="brandMark">CS</span>
          <div>
            <h1>CafeSurf</h1>
            <p>Cafe workspaces in Sri Lanka</p>
          </div>
        </div>

        <div className="navTabs" role="tablist">
          {canBookCafes && (
            <button className={view === 'explore' ? 'active' : ''} onClick={() => setView('explore')}>
              Explore
            </button>
          )}
          {canBookCafes && (
            <button className={view === 'bookings' ? 'active' : ''} onClick={() => setView('bookings')}>
              My bookings
            </button>
          )}
          {canManageCafes && (
            <button className={view === 'mycafes' ? 'active' : ''} onClick={() => setView('mycafes')}>
              {isAdmin ? 'All cafes' : 'My cafes'}
            </button>
          )}
          {isCustomer && (
            <button
              className={view === 'owner-application' ? 'active' : ''}
              onClick={() => setView('owner-application')}
            >
              Become an owner
            </button>
          )}
          {isAdmin && (
            <button
              className={view === 'applications' ? 'active' : ''}
              onClick={() => setView('applications')}
            >
              Owner applications
            </button>
          )}
        </div>

        {view === 'explore' && canBookCafes && (
          <section className="filterPanel" aria-label="Filters">
            <label>
              Area
              <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}>
                {areaFilters.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </label>

            <label className="switchLine">
              <input
                type="checkbox"
                checked={generatorOnly}
                onChange={(event) => setGeneratorOnly(event.target.checked)}
              />
              Generator backup
            </label>

            <label className="switchLine">
              <input
                type="checkbox"
                checked={fastWifiOnly}
                onChange={(event) => setFastWifiOnly(event.target.checked)}
              />
              100 Mbps plus WiFi
            </label>
          </section>
        )}

        <div className="sidebarSpacer" />

        <div className="userPanel">
          <div className="userInfo">
            <span className="userName">{user.name}</span>
            <span className="userRole">{user.role.replace('_', ' ')}</span>
          </div>
          <button className="ghostButton" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="mainColumn">
        {(error || notice) && (
          <div className={error ? 'toast error' : 'toast'}>
            <span>{error ?? notice}</span>
            <button onClick={() => { setError(null); setNotice(null); }}>Dismiss</button>
          </div>
        )}

        {view === 'explore' && canBookCafes && (
          <div className="workspaceGrid">
            <section className="listPane" aria-label="Cafe list">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Available spaces</p>
                  <h2>{loadingCafes ? 'Loading cafes' : `${cafes.length} cafes`}</h2>
                </div>
                <button className="ghostButton" onClick={() => void loadCafes()}>Refresh</button>
              </div>

              <div className="cafeList">
                {loadingCafes && [0, 1, 2].map((item) => <div className="skeletonCard" key={item} />)}
                {!loadingCafes && cafes.map((cafe) => (
                  <button
                    className={`cafeCard ${selectedCafe?.id === cafe.id ? 'selected' : ''}`}
                    key={cafe.id}
                    onClick={() => setSelectedCafe(cafe)}
                  >
                    <img src={imageForCafe(cafe)} alt="" />
                    <div className="cafeCardBody">
                      <div>
                        <h3>{cafe.name}</h3>
                        <p>{cafe.area}</p>
                      </div>
                      <div className="metricRow">
                        <span>LKR {cafe.hourly_rate}/hr</span>
                        <span>{cafe.wifi_speed_mbps} Mbps</span>
                        <span>{cafe.total_slots} seats</span>
                      </div>
                    </div>
                  </button>
                ))}
                {!loadingCafes && cafes.length === 0 && (
                  <div className="emptyState">
                    <h3>No cafes found</h3>
                    <p>Try relaxing the filters and refresh the list.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="detailPane" aria-label="Booking details">
              {selectedCafe ? (
                <CafeDetail
                  cafe={selectedCafe}
                  date={date}
                  slots={slots}
                  selectedHours={selectedHours}
                  selectedRange={selectedRange}
                  totalPrice={totalPrice}
                  loadingSlots={loadingSlots}
                  bookingNow={bookingNow}
                  onDateChange={setDate}
                  onToggleHour={toggleHour}
                  onBook={() => void submitBooking()}
                />
              ) : (
                <div className="emptyState tall">
                  <h2>Select a cafe</h2>
                  <p>Choose a workspace to see live hourly availability.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'bookings' && canBookCafes && (
          <BookingsView
            upcoming={upcomingBookings}
            past={pastBookings}
            latestBooking={latestBooking}
            userName={user.name}
            onCancel={(id) => void cancelExistingBooking(id)}
            onRefresh={() => void loadBookings()}
            onCheckIn={() => void checkInLatestBooking()}
          />
        )}

        {view === 'mycafes' && token && canManageCafes && (
          <CafeOwnerDashboard token={token} userRole={user.role} />
        )}

        {view === 'owner-application' && token && isCustomer && (
          <OwnerApplicationView
            token={token}
            currentRole={user.role}
            onProfileChanged={() => void refreshProfile()}
          />
        )}

        {view === 'applications' && token && isAdmin && (
          <AdminOwnerApplications token={token} />
        )}
      </section>
    </main>
  );
}

function CafeDetail(props: {
  cafe: Cafe;
  date: string;
  slots: AvailabilitySlot[];
  selectedHours: number[];
  selectedRange: { start: number; end: number } | null;
  totalPrice: number;
  loadingSlots: boolean;
  bookingNow: boolean;
  onDateChange: (date: string) => void;
  onToggleHour: (hour: number) => void;
  onBook: () => void;
}) {
  const {
    cafe,
    date,
    slots,
    selectedHours,
    selectedRange,
    totalPrice,
    loadingSlots,
    bookingNow,
    onDateChange,
    onToggleHour,
    onBook,
  } = props;
  const visibleSlots = slots.filter((slot) => slot.available > 0);

  return (
    <div className="detailContent">
      <div className="cafeHero">
        <img src={imageForCafe(cafe)} alt="" />
        <div>
          <p className="eyebrow">{cafe.area}</p>
          <h2>{cafe.name}</h2>
          <div className="heroStats">
            <span>LKR {cafe.hourly_rate} hourly</span>
            <span>{cafe.wifi_speed_mbps} Mbps WiFi</span>
            <span>{cafe.has_generator ? 'Generator' : 'Grid power'}</span>
          </div>
        </div>
      </div>

      <div className="bookingControls">
        <label>
          Date
          <input min={todayString()} type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <div className="selectionSummary">
          <span>{selectedRange ? `${hourLabel(selectedRange.start)} to ${hourLabel(selectedRange.end)}` : 'No time selected'}</span>
          <strong>LKR {totalPrice.toLocaleString()}</strong>
        </div>
      </div>

      <div className="slotGrid" aria-label="Hourly availability">
        {loadingSlots && <div className="loadingSlots">Loading availability...</div>}
        {!loadingSlots && visibleSlots.map((slot) => {
          const isSelected = selectedHours.includes(slot.hour);
          return (
            <button
              key={slot.hour}
              className={`slotButton ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleHour(slot.hour)}
            >
              <strong>{hourLabel(slot.hour)}</strong>
              <span>{slot.available}/{slot.total} open</span>
            </button>
          );
        })}
        {!loadingSlots && visibleSlots.length === 0 && (
          <div className="emptyState compact">
            <p>No open slots for this date.</p>
          </div>
        )}
      </div>

      <div className="stickyBookingBar">
        <div>
          <span>{selectedHours.length} hour{selectedHours.length === 1 ? '' : 's'} selected</span>
          <strong>LKR {totalPrice.toLocaleString()}</strong>
        </div>
        <button className="primaryButton" disabled={!selectedRange || bookingNow} onClick={onBook}>
          {bookingNow ? 'Requesting...' : 'Request booking'}
        </button>
      </div>
    </div>
  );
}

function BookingsView(props: {
  upcoming: BookingWithCafe[];
  past: BookingWithCafe[];
  latestBooking: Booking | null;
  userName: string;
  onCancel: (id: string) => void;
  onRefresh: () => void;
  onCheckIn: () => void;
}) {
  const { upcoming, past, latestBooking, userName, onCancel, onRefresh, onCheckIn } = props;

  return (
    <section className="bookingsPane">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{userName}</p>
          <h2>My bookings</h2>
        </div>
        <button className="ghostButton" onClick={onRefresh}>Refresh</button>
      </div>

      {latestBooking && (
        <div className="confirmationPanel">
          <div>
            <p className="eyebrow">Latest reservation</p>
            <h3>{latestBooking.id}</h3>
            <p>{latestBooking.date}, {hourLabel(latestBooking.start_time)} to {hourLabel(latestBooking.end_time)}</p>
          </div>
          <button className="primaryButton" disabled={latestBooking.status !== 'confirmed'} onClick={onCheckIn}>
            {latestBooking.status === 'checked_in' ? 'Checked in' : 'Check in'}
          </button>
        </div>
      )}

      <BookingSection title="Upcoming" bookings={upcoming} onCancel={onCancel} />
      <BookingSection title="Past and inactive" bookings={past} />
    </section>
  );
}

function BookingSection(props: {
  title: string;
  bookings: BookingWithCafe[];
  onCancel?: (id: string) => void;
}) {
  const { title, bookings, onCancel } = props;

  return (
    <section className="bookingGroup">
      <h3>{title}</h3>
      {bookings.length === 0 ? (
        <div className="emptyState compact">
          <p>No bookings here yet.</p>
        </div>
      ) : (
        <div className="bookingList">
          {bookings.map((booking) => (
            <article className="bookingCard" key={booking.id}>
              <div>
                <h4>{booking.cafe_name}</h4>
                <p>{booking.cafe_area}</p>
              </div>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>{booking.date}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{hourLabel(booking.start_time)} to {hourLabel(booking.end_time)}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>LKR {booking.total_price.toLocaleString()}</dd>
                </div>
              </dl>
              <div className="bookingActions">
                <span className={`statusPill ${booking.status}`}>{booking.status.replace('_', ' ')}</span>
                {onCancel && (booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button className="dangerButton" onClick={() => onCancel(booking.id)}>Cancel</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function largestContiguousBlock(hours: number[]) {
  if (!hours.length) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const segments: number[][] = [[sorted[0]]];

  for (const hour of sorted.slice(1)) {
    const segment = segments[segments.length - 1];
    if (hour === segment[segment.length - 1] + 1) {
      segment.push(hour);
    } else {
      segments.push([hour]);
    }
  }

  return segments.reduce((largest, segment) => (segment.length > largest.length ? segment : largest), [] as number[]);
}
