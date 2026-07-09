import { useEffect, useState } from 'react';
import {
  fetchMyCafes,
  createCafeApi,
  updateCafeApi,
  deleteCafeApi,
  fetchCafeBookings,
} from './api';
import type { Cafe, CafeBooking, CreateCafeRequest } from './types';

interface CafeOwnerDashboardProps {
  token: string;
  userRole: string;
}

type DashboardView = 'list' | 'form' | 'bookings';

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

function hourLabel(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const display = normalized % 12 || 12;
  return `${display}:00 ${suffix}`;
}

export default function CafeOwnerDashboard({ token, userRole }: CafeOwnerDashboardProps) {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Sub-view state
  const [dashView, setDashView] = useState<DashboardView>('list');
  const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
  const [formData, setFormData] = useState<CreateCafeRequest>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Bookings viewer state
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [cafeBookings, setCafeBookings] = useState<CafeBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    void loadCafes();
  }, []);

  async function loadCafes() {
    setLoading(true);
    setError(null);
    try {
      setCafes(await fetchMyCafes(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load cafes');
    } finally {
      setLoading(false);
    }
  }

  // ── Form Handlers ─────────────────────────────────

  function openCreateForm() {
    setEditingCafe(null);
    setFormData(EMPTY_FORM);
    setDashView('form');
  }

  function openEditForm(cafe: Cafe) {
    setEditingCafe(cafe);
    setFormData({
      name: cafe.name,
      area: cafe.area,
      latitude: cafe.latitude,
      longitude: cafe.longitude,
      hourly_rate: cafe.hourly_rate,
      total_slots: cafe.total_slots,
      has_generator: cafe.has_generator,
      wifi_speed_mbps: cafe.wifi_speed_mbps,
    });
    setDashView('form');
  }

  function updateField<K extends keyof CreateCafeRequest>(key: K, value: CreateCafeRequest[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingCafe) {
        await updateCafeApi(token, editingCafe.id, formData);
        setNotice(`"${formData.name}" updated successfully.`);
      } else {
        await createCafeApi(token, formData);
        setNotice(`"${formData.name}" created successfully.`);
      }
      await loadCafes();
      setDashView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save cafe');
    } finally {
      setFormLoading(false);
    }
  }

  // ── Delete Handler ────────────────────────────────

  async function handleDelete(cafe: Cafe) {
    if (!confirm(`Delete "${cafe.name}"? This will also remove all its bookings.`)) return;
    setError(null);
    try {
      await deleteCafeApi(token, cafe.id);
      setNotice(`"${cafe.name}" deleted.`);
      await loadCafes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete cafe');
    }
  }

  // ── Bookings Viewer ───────────────────────────────

  async function openBookings(cafe: Cafe) {
    setSelectedCafe(cafe);
    setDashView('bookings');
    setBookingsLoading(true);
    setError(null);
    try {
      setCafeBookings(await fetchCafeBookings(token, cafe.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load bookings');
      setCafeBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────

  return (
    <section className="dashboardPane">
      {(error || notice) && (
        <div className={error ? 'toast error' : 'toast'}>
          <span>{error ?? notice}</span>
          <button onClick={() => { setError(null); setNotice(null); }}>Dismiss</button>
        </div>
      )}

      {dashView === 'list' && (
        <>
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{userRole === 'admin' ? 'All cafes' : 'Your cafes'}</p>
              <h2>{loading ? 'Loading…' : `${cafes.length} cafe${cafes.length === 1 ? '' : 's'}`}</h2>
            </div>
            <div className="headerActions">
              <button className="ghostButton" onClick={() => void loadCafes()}>Refresh</button>
              <button className="addButton" onClick={openCreateForm}>+ Add Cafe</button>
            </div>
          </div>

          {loading && [0, 1, 2].map((i) => <div className="skeletonCard" key={i} />)}

          {!loading && cafes.length === 0 && (
            <div className="emptyState">
              <h3>No cafes yet</h3>
              <p>Create your first workspace to start receiving bookings.</p>
            </div>
          )}

          {!loading && (
            <div className="manageCafeList">
              {cafes.map((cafe) => (
                <article className="cafeManageCard" key={cafe.id}>
                  <div className="cafeManageInfo">
                    <h3>{cafe.name}</h3>
                    <p>{cafe.area}</p>
                    <div className="metricRow">
                      <span>LKR {cafe.hourly_rate}/hr</span>
                      <span>{cafe.wifi_speed_mbps} Mbps</span>
                      <span>{cafe.total_slots} seats</span>
                      {cafe.has_generator && <span className="generatorBadge">Generator</span>}
                    </div>
                  </div>
                  <div className="cafeManageActions">
                    <button className="ghostButton" onClick={() => openBookings(cafe)}>
                      View Bookings
                    </button>
                    <button className="ghostButton" onClick={() => openEditForm(cafe)}>
                      Edit
                    </button>
                    <button className="dangerButton" onClick={() => void handleDelete(cafe)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {dashView === 'form' && (
        <div className="cafeFormSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{editingCafe ? 'Edit cafe' : 'New cafe'}</p>
              <h2>{editingCafe ? editingCafe.name : 'Add a new cafe'}</h2>
            </div>
            <button className="ghostButton" onClick={() => setDashView('list')}>← Back</button>
          </div>

          <form className="cafeForm" onSubmit={(e) => void handleFormSubmit(e)}>
            <div className="formGrid">
              <label>
                Cafe Name *
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Brew & Code Colombo"
                  required
                />
              </label>

              <label>
                Area *
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  placeholder="e.g. Colombo 07"
                  required
                />
              </label>

              <label>
                Latitude *
                <input
                  type="number"
                  step="any"
                  value={formData.latitude || ''}
                  onChange={(e) => updateField('latitude', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 6.9147"
                  required
                />
              </label>

              <label>
                Longitude *
                <input
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => updateField('longitude', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 79.8624"
                  required
                />
              </label>

              <label>
                Hourly Rate (LKR) *
                <input
                  type="number"
                  min="1"
                  value={formData.hourly_rate || ''}
                  onChange={(e) => updateField('hourly_rate', parseInt(e.target.value) || 0)}
                  placeholder="e.g. 500"
                  required
                />
              </label>

              <label>
                Total Seats *
                <input
                  type="number"
                  min="1"
                  value={formData.total_slots || ''}
                  onChange={(e) => updateField('total_slots', parseInt(e.target.value) || 0)}
                  placeholder="e.g. 20"
                  required
                />
              </label>

              <label>
                WiFi Speed (Mbps)
                <input
                  type="number"
                  min="0"
                  value={formData.wifi_speed_mbps || ''}
                  onChange={(e) => updateField('wifi_speed_mbps', parseInt(e.target.value) || 0)}
                  placeholder="e.g. 100"
                />
              </label>

              <label className="switchLine">
                <input
                  type="checkbox"
                  checked={formData.has_generator}
                  onChange={(e) => updateField('has_generator', e.target.checked)}
                />
                Generator Backup
              </label>
            </div>

            <div className="formActions">
              <button type="button" className="ghostButton" onClick={() => setDashView('list')}>
                Cancel
              </button>
              <button type="submit" className="primaryButton" disabled={formLoading}>
                {formLoading ? 'Saving…' : editingCafe ? 'Update Cafe' : 'Create Cafe'}
              </button>
            </div>
          </form>
        </div>
      )}

      {dashView === 'bookings' && selectedCafe && (
        <div className="cafeBookingsSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{selectedCafe.area}</p>
              <h2>{selectedCafe.name} — Bookings</h2>
            </div>
            <button className="ghostButton" onClick={() => setDashView('list')}>← Back</button>
          </div>

          {bookingsLoading && (
            <div className="loadingSlots">Loading bookings…</div>
          )}

          {!bookingsLoading && cafeBookings.length === 0 && (
            <div className="emptyState compact">
              <p>No bookings for this cafe yet.</p>
            </div>
          )}

          {!bookingsLoading && cafeBookings.length > 0 && (
            <div className="bookingsTableWrap">
              <table className="bookingsTable">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cafeBookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.user_name}</td>
                      <td>{b.user_email}</td>
                      <td>{b.date}</td>
                      <td>{hourLabel(b.start_time)} – {hourLabel(b.end_time)}</td>
                      <td>LKR {b.total_price.toLocaleString()}</td>
                      <td>
                        <span className={`statusPill ${b.status}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
