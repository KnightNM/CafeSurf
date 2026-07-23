import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createCafeApi,
  deleteCafeApi,
  deleteCafeCoverApi,
  fetchCafeBookings,
  fetchMyCafes,
  updateBookingStatusApi,
  updateCafeApi,
  uploadCafeCoverApi,
} from './api';
import WorkspaceCover from './components/WorkspaceCover';
import { hourLabel } from './lib/format';
import type { Cafe, CafeBooking, CreateCafeRequest } from './types';

interface CafeOwnerDashboardProps {
  token: string;
  userRole: string;
}

const EMPTY_FORM: CreateCafeRequest = {
  name: '',
  area: '',
  latitude: 0,
  longitude: 0,
  hourly_rate: 0,
  total_slots: 0,
  has_generator: false,
  wifi_speed_mbps: 50,
};

export default function CafeOwnerDashboard({ token, userRole }: CafeOwnerDashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCafeRequest>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [cafeBookings, setCafeBookings] = useState<CafeBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const isNew = location.pathname.endsWith('/new');
  const isEdit = location.pathname.endsWith('/edit');
  const isBookings = location.pathname.endsWith('/bookings');
  const editingCafe = useMemo(() => cafes.find((cafe) => cafe.id === id) ?? null, [cafes, id]);

  async function loadCafes() {
    setLoading(true);
    try {
      setCafes(await fetchMyCafes(token));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load spaces');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCafes(); }, [token]);

  useEffect(() => {
    setCoverFile(null);
    if (isNew) {
      setFormData(EMPTY_FORM);
    } else if (isEdit && editingCafe) {
      setFormData({
        name: editingCafe.name,
        area: editingCafe.area,
        latitude: editingCafe.latitude,
        longitude: editingCafe.longitude,
        hourly_rate: editingCafe.hourly_rate,
        total_slots: editingCafe.total_slots,
        has_generator: editingCafe.has_generator,
        wifi_speed_mbps: editingCafe.wifi_speed_mbps,
      });
    }
  }, [isNew, isEdit, editingCafe]);

  useEffect(() => {
    if (!isBookings || !id) return;
    setBookingsLoading(true);
    fetchCafeBookings(token, id)
      .then(setCafeBookings)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load bookings'))
      .finally(() => setBookingsLoading(false));
  }, [isBookings, id, token]);

  function updateField<K extends keyof CreateCafeRequest>(key: K, value: CreateCafeRequest[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function chooseCover(file: File | undefined) {
    if (!file) {
      setCoverFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Cover image must be JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Cover image must be no larger than 5 MB.');
      return;
    }
    setCoverFile(file);
    setError(null);
  }

  async function saveCafe(event: React.FormEvent) {
    event.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      let saved = editingCafe
        ? await updateCafeApi(token, editingCafe.id, formData)
        : await createCafeApi(token, formData);
      if (coverFile) saved = await uploadCafeCoverApi(token, saved.id, coverFile);
      setNotice(`${saved.name} ${editingCafe ? 'updated' : 'created'} successfully.`);
      await loadCafes();
      navigate('/owner/cafes');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save space');
    } finally {
      setFormLoading(false);
    }
  }

  async function removeCover() {
    if (!editingCafe) return;
    try {
      await deleteCafeCoverApi(token, editingCafe.id);
      setNotice('Cover image removed. The abstract cover is active.');
      await loadCafes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove cover');
    }
  }

  async function removeCafe(cafe: Cafe) {
    if (!window.confirm(`Delete "${cafe.name}" and all its bookings?`)) return;
    try {
      await deleteCafeApi(token, cafe.id);
      setNotice(`${cafe.name} deleted.`);
      await loadCafes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete space');
    }
  }

  async function updateBooking(bookingId: string, status: 'confirmed' | 'rejected') {
    if (!id) return;
    try {
      await updateBookingStatusApi(token, bookingId, status);
      setNotice(`Booking ${status}.`);
      setCafeBookings(await fetchCafeBookings(token, id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update booking');
    }
  }

  const feedback = (error || notice) && (
    <div className={`toast ${error ? 'error' : ''}`}>
      <span>{error ?? notice}</span>
      <button onClick={() => { setError(null); setNotice(null); }}>Dismiss</button>
    </div>
  );

  if (isBookings) {
    return (
      <section className="cafeBookingsSection">
        {feedback}
        <div className="sectionHeader">
          <div><p className="kicker">BOOKING OPERATIONS</p><h2>{editingCafe?.name ?? 'Workspace bookings'}</h2></div>
          <button className="ghostButton" onClick={() => navigate('/owner/cafes')}>← Back</button>
        </div>
        {bookingsLoading ? <div className="emptyState">Loading bookings…</div> : !cafeBookings.length ? (
          <div className="emptyState"><h3>No booking requests yet.</h3></div>
        ) : (
          <div className="bookingsTableWrap">
            <table className="bookingsTable">
              <thead><tr><th>Customer</th><th>Date</th><th>Time</th><th>Team</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {cafeBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>{booking.user_name}</strong><br /><small>{booking.user_email}</small></td>
                    <td>{booking.date}</td>
                    <td>{hourLabel(booking.start_time)}–{hourLabel(booking.end_time)}</td>
                    <td>{booking.team_size}</td>
                    <td>LKR {booking.total_price.toLocaleString()}</td>
                    <td><span className={`statusPill ${booking.status}`}>{booking.status.replace('_', ' ')}</span></td>
                    <td>
                      {booking.status === 'pending' && (
                        <div className="headerActions">
                          <button className="primaryButton" onClick={() => void updateBooking(booking.id, 'confirmed')}>Confirm</button>
                          <button className="dangerButton" onClick={() => void updateBooking(booking.id, 'rejected')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  if (isNew || isEdit) {
    const coverCafe = editingCafe ?? {
      id: 'preview',
      owner_id: null,
      name: formData.name || 'New workspace',
      area: formData.area || 'Sri Lanka',
      latitude: formData.latitude,
      longitude: formData.longitude,
      hourly_rate: formData.hourly_rate,
      total_slots: formData.total_slots || 8,
      has_generator: formData.has_generator,
      wifi_speed_mbps: formData.wifi_speed_mbps,
      cover_image_path: null,
      cover_image_url: null,
    } as Cafe;

    return (
      <section className="cafeFormSection">
        {feedback}
        <div className="sectionHeader">
          <div><p className="kicker">{editingCafe ? 'EDIT WORKSPACE' : 'NEW WORKSPACE'}</p><h2>{editingCafe?.name ?? 'Add a space.'}</h2></div>
          <button className="ghostButton" onClick={() => navigate('/owner/cafes')}>← Back</button>
        </div>
        <form className="cafeForm" onSubmit={(event) => void saveCafe(event)}>
          <div className="coverField">
            <WorkspaceCover cafe={coverCafe} />
            <div className="coverFieldActions">
              <strong>Optional workspace cover</strong>
              <p>JPEG, PNG, or WebP up to 5 MB. Without one, CafeSurf creates the branded abstract cover shown here.</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseCover(event.target.files?.[0])} />
              {coverFile && <small>Ready to upload: {coverFile.name}</small>}
              {editingCafe?.cover_image_url && <button className="dangerButton" type="button" onClick={() => void removeCover()}>Remove current cover</button>}
            </div>
          </div>
          <div className="formGrid">
            <label>Workspace name<input value={formData.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
            <label>Area<input value={formData.area} onChange={(event) => updateField('area', event.target.value)} required /></label>
            <label>Latitude<input type="number" step="any" value={formData.latitude || ''} onChange={(event) => updateField('latitude', Number(event.target.value))} required /></label>
            <label>Longitude<input type="number" step="any" value={formData.longitude || ''} onChange={(event) => updateField('longitude', Number(event.target.value))} required /></label>
            <label>Rate per seat / hour (LKR)<input type="number" min="1" value={formData.hourly_rate || ''} onChange={(event) => updateField('hourly_rate', Number(event.target.value))} required /></label>
            <label>Total seats<input type="number" min="1" value={formData.total_slots || ''} onChange={(event) => updateField('total_slots', Number(event.target.value))} required /></label>
            <label>Wi‑Fi speed (Mbps)<input type="number" min="0" value={formData.wifi_speed_mbps || ''} onChange={(event) => updateField('wifi_speed_mbps', Number(event.target.value))} /></label>
            <label className="filterToggle"><input type="checkbox" checked={formData.has_generator} onChange={(event) => updateField('has_generator', event.target.checked)} /><span>Backup power available</span></label>
          </div>
          <div className="formActions">
            <button type="button" className="ghostButton" onClick={() => navigate('/owner/cafes')}>Cancel</button>
            <button className="primaryButton" disabled={formLoading}>{formLoading ? 'Saving…' : editingCafe ? 'Update workspace' : 'Create workspace'}</button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="dashboardPane">
      {feedback}
      <div className="sectionHeader">
        <div><p className="kicker">{userRole === 'admin' ? 'ALL PARTNER SPACES' : 'YOUR SPACES'}</p><h2>{loading ? 'Loading…' : `${cafes.length} workspace${cafes.length === 1 ? '' : 's'}.`}</h2></div>
        <div className="headerActions">
          <button className="ghostButton" onClick={() => void loadCafes()}>Refresh</button>
          <button className="addButton" onClick={() => navigate('/owner/cafes/new')}>+ Add workspace</button>
        </div>
      </div>
      {loading ? <div className="emptyState">Loading spaces…</div> : !cafes.length ? (
        <div className="emptyState"><h3>No spaces yet.</h3><p>Add your first team-ready workspace.</p></div>
      ) : (
        <div className="manageCafeList">
          {cafes.map((cafe) => (
            <article className="cafeManageCard" key={cafe.id}>
              <WorkspaceCover cafe={cafe} />
              <div className="cafeManageInfo">
                <p className="kicker">{cafe.area}</p>
                <h3>{cafe.name}</h3>
                <div className="workspaceMetrics">
                  <span>LKR {cafe.hourly_rate}/seat/hr</span>
                  <span>{cafe.total_slots} seats</span>
                  <span>{cafe.wifi_speed_mbps} Mbps</span>
                </div>
              </div>
              <div className="cafeManageActions">
                <button className="primaryButton" onClick={() => navigate(`/owner/cafes/${cafe.id}/bookings`)}>Bookings</button>
                <button className="ghostButton" onClick={() => navigate(`/owner/cafes/${cafe.id}/edit`)}>Edit</button>
                <button className="dangerButton" onClick={() => void removeCafe(cafe)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
