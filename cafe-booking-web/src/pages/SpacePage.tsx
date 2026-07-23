import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createBooking, fetchAvailability, fetchCafe } from '../api';
import PublicHeader from '../components/PublicHeader';
import WorkspaceCover from '../components/WorkspaceCover';
import { hourLabel, largestContiguousBlock, minuteLabel, todayString } from '../lib/format';
import type { AvailabilitySlot, BookingIntent, Cafe, User } from '../types';

interface SpacePageProps {
  user: User | null;
  token: string | null;
  pendingIntent: BookingIntent | null;
  onIntentChange: (intent: BookingIntent | null) => void;
  onAuth: () => void;
  onLogout: () => void;
}

export default function SpacePage({
  user,
  token,
  pendingIntent,
  onIntentChange,
  onAuth,
  onLogout,
}: SpacePageProps) {
  const { id = '' } = useParams();
  const restored = pendingIntent?.cafeId === id ? pendingIntent : null;
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [date, setDate] = useState(restored?.date ?? todayString());
  const [teamSize, setTeamSize] = useState(restored?.teamSize ?? 2);
  const [selectedHours, setSelectedHours] = useState<number[]>(restored?.selectedHours ?? []);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCafe(id)
      .then((result) => {
        if (!active) return;
        setCafe(result);
        setTeamSize((current) => Math.min(Math.max(current, 1), result.total_slots));
      })
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : 'Could not load space'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchAvailability(id, date)
      .then((result) => active && setSlots(result))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : 'Could not load availability'));
    return () => { active = false; };
  }, [id, date]);

  const selectedRange = useMemo(() => {
    if (!selectedHours.length) return null;
    const sorted = [...selectedHours].sort((a, b) => a - b);
    return { start: sorted[0], end: sorted[sorted.length - 1] + 1 };
  }, [selectedHours]);
  const total = cafe && selectedRange
    ? cafe.hourly_rate * (selectedRange.end - selectedRange.start) * teamSize
    : 0;

  function updateTeamSize(next: number) {
    setTeamSize(next);
    setSelectedHours([]);
  }

  function toggleHour(hour: number) {
    const slot = slots.find((item) => item.hour === hour);
    if (!slot || slot.available < teamSize) return;
    setSelectedHours((current) => {
      if (current.includes(hour)) return largestContiguousBlock(current.filter((item) => item !== hour));
      if (!current.length) return [hour];
      const sorted = [...current].sort((a, b) => a - b);
      if (hour === sorted[0] - 1 || hour === sorted[sorted.length - 1] + 1) return [...current, hour];
      return [hour];
    });
  }

  function preserveAndAuthenticate() {
    onIntentChange({ cafeId: id, date, selectedHours, teamSize });
    onAuth();
  }

  async function submitBooking() {
    if (!cafe || !selectedRange) return;
    if (!user || !token) {
      preserveAndAuthenticate();
      return;
    }
    if (user.role === 'cafe_owner') {
      setError('Cafe owners cannot create customer bookings.');
      return;
    }
    setBooking(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createBooking({
        cafe_id: cafe.id,
        date,
        start_time: selectedRange.start,
        end_time: selectedRange.end,
        team_size: teamSize,
      }, token);
      setNotice(`Request sent for ${teamSize} ${teamSize === 1 ? 'person' : 'people'} · ${hourLabel(created.start_time)}–${hourLabel(created.end_time)}.`);
      setSelectedHours([]);
      onIntentChange(null);
      setSlots(await fetchAvailability(cafe.id, date));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create booking');
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <div className="pageLoading">Preparing this workspace…</div>;
  if (!cafe) return <div className="pageLoading">Workspace not found.</div>;

  return (
    <div className="publicPage">
      <PublicHeader user={user} onAuth={onAuth} onLogout={onLogout} />
      <main className="spacePage">
        <div className="breadcrumbs"><Link to="/">Spaces</Link><span>↗</span><strong>{cafe.name}</strong></div>
        {(error || notice) && (
          <div className={`notice ${error ? 'noticeError' : ''}`} role={error ? 'alert' : 'status'}>
            <span>{error ?? notice}</span>
            <button onClick={() => { setError(null); setNotice(null); }}>×</button>
          </div>
        )}
        <section className="spaceHero">
          <WorkspaceCover cafe={cafe} large />
          <div className="spaceHeroCopy">
            <p className="kicker">{cafe.area} · TEAM-READY SPACE</p>
            <h1>{cafe.name}</h1>
            <p>{cafe.description || 'Flexible seating for solo focus and small-group work, with the practical details visible before you book.'}</p>
            <div className="featurePills">
              <span>{cafe.total_slots} seats</span>
              <span>{cafe.wifi_speed_mbps} Mbps Wi‑Fi</span>
              <span>{cafe.has_generator ? 'Backup power' : 'Grid power'}</span>
            </div>
            <div className="rateBlock"><span>Per seat / hour</span><strong>LKR {cafe.hourly_rate.toLocaleString()}</strong></div>
            {cafe.google_maps_url && (
              <a className="googleMapsButton" href={cafe.google_maps_url} target="_blank" rel="noreferrer">
                View on Google Maps ↗
              </a>
            )}
          </div>
        </section>

        {cafe.google_place_id && (
          <section className="googlePlacePanel">
            <div>
              <p className="kicker">GOOGLE-VERIFIED LOCATION</p>
              <h2>{cafe.name}</h2>
              <p>{cafe.area}</p>
            </div>
            <div className="googlePlaceFacts">
              {cafe.google_business_status && <span>{cafe.google_business_status.split('_').join(' ').toLowerCase()}</span>}
              {cafe.contact_phone && <a href={`tel:${cafe.contact_phone}`}>{cafe.contact_phone}</a>}
              {cafe.website_url && <a href={cafe.website_url} target="_blank" rel="noreferrer">Website ↗</a>}
              {cafe.google_maps_url && <a href={cafe.google_maps_url} target="_blank" rel="noreferrer">Directions on Google Maps ↗</a>}
            </div>
            <small className="googleAttribution">Location imported from Google Maps and approved by CafeSurf.</small>
          </section>
        )}

        <section className="profileDetailsGrid">
          <article>
            <p className="kicker">CAFESURF OPERATING HOURS</p>
            <h2>When you can book.</h2>
            <div className="publicHours">
              {Object.entries(cafe.opening_hours).map(([day, schedule]) => (
                <div key={day}>
                  <strong>{day}</strong>
                  <span>{schedule.closed
                    ? 'Closed'
                    : schedule.periods.map((period) => `${minuteLabel(period.open_minute)}–${minuteLabel(period.close_minute)}`).join(', ')}</span>
                </div>
              ))}
            </div>
          </article>
          <article>
            <p className="kicker">AMENITIES</p>
            <h2>Workspace details.</h2>
            <div className="featurePills">
              {cafe.amenities.length ? cafe.amenities.map((amenity) => <span key={amenity}>{amenity.replace(/_/g, ' ')}</span>) : <span>No additional amenities listed</span>}
            </div>
          </article>
          <article>
            <p className="kicker">CONTACT</p>
            <h2>Reach the café.</h2>
            <div className="contactStack">
              {cafe.contact_phone && <a href={`tel:${cafe.contact_phone}`}>{cafe.contact_phone}</a>}
              {cafe.contact_email && <a href={`mailto:${cafe.contact_email}`}>{cafe.contact_email}</a>}
              {cafe.website_url && <a href={cafe.website_url} target="_blank" rel="noreferrer">Website ↗</a>}
              {!cafe.contact_phone && !cafe.contact_email && !cafe.website_url && <span>No contact details listed.</span>}
            </div>
          </article>
          <article>
            <p className="kicker">BEFORE YOU ARRIVE</p>
            <h2>Rules and access.</h2>
            <h3>House rules</h3><p>{cafe.house_rules || 'No additional house rules listed.'}</p>
            <h3>Access instructions</h3><p>{cafe.access_instructions || 'Ask the café team for the CafeSurf workspace when you arrive.'}</p>
          </article>
        </section>

        <section className="bookingComposer">
          <div className="composerHeader">
            <div><p className="kicker">BUILD YOUR SESSION</p><h2>Choose when and who.</h2></div>
            <p>Every selected hour must have enough seats for your whole team.</p>
          </div>
          <div className="composerControls">
            <label>Date<input type="date" min={todayString()} value={date} onChange={(event) => {
              setDate(event.target.value);
              setSelectedHours([]);
            }} /></label>
            <label>People
              <div className="stepper">
                <button onClick={() => updateTeamSize(Math.max(1, teamSize - 1))} aria-label="Remove one person">−</button>
                <strong>{teamSize}</strong>
                <button onClick={() => updateTeamSize(Math.min(cafe.total_slots, teamSize + 1))} aria-label="Add one person">+</button>
              </div>
            </label>
            <div className="selectionReadout">
              <span>{selectedRange ? `${hourLabel(selectedRange.start)}–${hourLabel(selectedRange.end)}` : 'Select a continuous time block'}</span>
              <strong>LKR {total.toLocaleString()}</strong>
            </div>
          </div>
          <div className="timeGrid" aria-label="Hourly availability">
            {slots.map((slot) => {
              const selected = selectedHours.includes(slot.hour);
              const unavailable = slot.available < teamSize;
              return (
                <button
                  key={slot.hour}
                  className={selected ? 'selected' : ''}
                  disabled={unavailable}
                  onClick={() => toggleHour(slot.hour)}
                  aria-pressed={selected}
                >
                  <strong>{hourLabel(slot.hour)}</strong>
                  <span>{unavailable ? `${slot.available} seats left` : `${slot.available} available`}</span>
                </button>
              );
            })}
          </div>
          <div className="bookingBar">
            <div><span>{teamSize} {teamSize === 1 ? 'person' : 'people'} · {selectedHours.length} {selectedHours.length === 1 ? 'hour' : 'hours'}</span><strong>LKR {total.toLocaleString()}</strong></div>
            <button className="pillButton brassButton" disabled={!selectedRange || booking} onClick={() => void submitBooking()}>
              {booking ? 'Sending request…' : user ? 'Confirm booking request' : 'Sign in to continue'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
