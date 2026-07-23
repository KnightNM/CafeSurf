import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createCafeApi,
  createCafeRevisionApi,
  deleteCafeApi,
  deleteCafeCoverApi,
  permanentlyDeleteCafeApi,
  fetchCafeBookings,
  fetchMyCafeRevisions,
  fetchMyCafes,
  submitCafeRevisionApi,
  updateBookingStatusApi,
  updateCafeApi,
  updateCafeRevisionApi,
  uploadCafeCoverApi,
  uploadCafeRevisionCoverApi,
  withdrawCafeRevisionApi,
} from './api';
import CafeProfileForm, { createEmptyProfile } from './components/CafeProfileForm';
import WorkspaceCover from './components/WorkspaceCover';
import { hourLabel } from './lib/format';
import type { Cafe, CafeBooking, CafeRevision, CreateCafeRequest } from './types';

interface CafeOwnerDashboardProps { token: string; userRole: string }

function profileFromCafe(cafe: Cafe): CreateCafeRequest {
  return {
    name: cafe.name,
    area: cafe.area,
    latitude: Number(cafe.latitude),
    longitude: Number(cafe.longitude),
    hourly_rate: cafe.hourly_rate,
    total_slots: cafe.total_slots,
    has_generator: cafe.has_generator,
    wifi_speed_mbps: cafe.wifi_speed_mbps,
    google_place_id: cafe.google_place_id,
    google_business_status: cafe.google_business_status,
    google_imported_at: cafe.google_imported_at,
    description: cafe.description,
    contact_phone: cafe.contact_phone,
    contact_email: cafe.contact_email,
    website_url: cafe.website_url,
    amenities: cafe.amenities,
    opening_hours: cafe.opening_hours,
    house_rules: cafe.house_rules,
    access_instructions: cafe.access_instructions,
    remove_cover: false,
  };
}

export default function CafeOwnerDashboard({ token, userRole }: CafeOwnerDashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id, revisionId } = useParams();
  const isAdmin = userRole === 'admin';
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [revisions, setRevisions] = useState<CafeRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCafeRequest>(createEmptyProfile);
  const [formLoading, setFormLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [cafeBookings, setCafeBookings] = useState<CafeBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [publicationFilter, setPublicationFilter] = useState<'published' | 'archived'>('published');

  const isNew = location.pathname.endsWith('/new');
  const isEdit = location.pathname.endsWith('/edit');
  const isBookings = location.pathname.endsWith('/bookings');
  const editingCafe = useMemo(() => cafes.find((cafe) => cafe.id === id) ?? null, [cafes, id]);
  const editingRevision = useMemo(
    () => revisions.find((revision) => revision.id === revisionId) ?? null,
    [revisions, revisionId]
  );
  const visibleCafes = useMemo(
    () => cafes.filter((cafe) => cafe.publication_status === publicationFilter),
    [cafes, publicationFilter]
  );

  async function loadData() {
    setLoading(true);
    try {
      const [nextCafes, nextRevisions] = await Promise.all([
        fetchMyCafes(token),
        isAdmin ? Promise.resolve([]) : fetchMyCafeRevisions(token),
      ]);
      setCafes(nextCafes);
      setRevisions(nextRevisions);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load spaces');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, isAdmin]);

  useEffect(() => {
    setCoverFile(null);
    if (isNew) setFormData(createEmptyProfile());
    else if (editingRevision) setFormData(editingRevision.proposed_data);
    else if (isEdit && editingCafe) setFormData(profileFromCafe(editingCafe));
  }, [isNew, isEdit, editingCafe, editingRevision]);

  useEffect(() => {
    if (!isBookings || !id) return;
    setCafeBookings([]);
    setBookingsLoading(true);
    fetchCafeBookings(token, id)
      .then(setCafeBookings)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load bookings'))
      .finally(() => setBookingsLoading(false));
  }, [isBookings, id, token]);

  function chooseCover(file?: File) {
    if (!file) return setCoverFile(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Cover must be JPEG, PNG, or WebP.');
    if (file.size > 5 * 1024 * 1024) return setError('Cover must be no larger than 5 MB.');
    setCoverFile(file);
    setError(null);
  }

  async function saveProfile(submit: boolean) {
    setFormLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        let saved = editingCafe
          ? await updateCafeApi(token, editingCafe.id, formData)
          : await createCafeApi(token, formData);
        if (coverFile) saved = await uploadCafeCoverApi(token, saved.id, coverFile);
        setNotice(`${saved.name} published immediately.`);
      } else {
        let revision = editingRevision
          ? await updateCafeRevisionApi(token, editingRevision.id, formData)
          : await createCafeRevisionApi(token, editingCafe ? 'update' : 'create', formData, editingCafe?.id);
        if (coverFile) revision = await uploadCafeRevisionCoverApi(token, revision.id, coverFile);
        if (submit) revision = await submitCafeRevisionApi(token, revision.id);
        setNotice(submit ? 'Submitted for admin approval.' : 'Draft saved. It is not public yet.');
      }
      await loadData();
      navigate('/owner/cafes');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save café profile');
    } finally {
      setFormLoading(false);
    }
  }

  async function requestArchive(cafe: Cafe) {
    const prompt = isAdmin
      ? `Archive "${cafe.name}"? Future active bookings will be cancelled, but history will remain.`
      : `Submit a removal request for "${cafe.name}"? It stays public until an admin approves.`;
    if (!window.confirm(prompt)) return;
    try {
      if (isAdmin) {
        await deleteCafeApi(token, cafe.id);
        setNotice(`${cafe.name} archived.`);
      } else {
        const revision = await createCafeRevisionApi(token, 'archive', profileFromCafe(cafe), cafe.id);
        await submitCafeRevisionApi(token, revision.id);
        setNotice('Removal request submitted.');
      }
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit removal request');
    }
  }

  async function permanentlyRemoveCafe(cafe: Cafe) {
    const typed = window.prompt(
      `PERMANENT ADMIN VETO\n\nThis deletes the café, every booking, every revision, and its stored covers.\n\nType the café name exactly to continue:\n${cafe.name}`
    );
    if (typed === null) return;
    if (typed !== cafe.name) {
      setError('The café name did not match exactly. Nothing was deleted.');
      return;
    }
    if (!window.confirm(
      `Final warning: permanently delete "${cafe.name}" and all associated data? This cannot be recovered.`
    )) return;

    try {
      await permanentlyDeleteCafeApi(token, cafe.id, typed);
      setNotice(`${cafe.name} and all associated data were permanently deleted.`);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not permanently delete café');
    }
  }

  async function withdraw(revision: CafeRevision) {
    if (!window.confirm('Withdraw this revision? The live café will not change.')) return;
    try {
      await withdrawCafeRevisionApi(token, revision.id);
      setNotice('Revision withdrawn.');
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not withdraw revision');
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
    <div className={`toast ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
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
        {editingCafe?.publication_status === 'archived' && (
          <div className="notice">This café is archived. Booking history is read-only.</div>
        )}
        {bookingsLoading ? <div className="emptyState">Loading bookings…</div> : !cafeBookings.length ? (
          <div className="emptyState"><h3>No booking requests yet.</h3></div>
        ) : (
          <div className="bookingsTableWrap"><table className="bookingsTable">
            <thead><tr><th>Customer</th><th>Date</th><th>Time</th><th>Team</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{cafeBookings.map((booking) => (
              <tr key={booking.id}>
                <td><strong>{booking.user_name}</strong><br /><small>{booking.user_email}</small></td>
                <td>{booking.date}</td><td>{hourLabel(booking.start_time)}–{hourLabel(booking.end_time)}</td>
                <td>{booking.team_size}</td><td>LKR {booking.total_price.toLocaleString()}</td>
                <td><span className={`statusPill ${booking.status}`}>{booking.status.replace('_', ' ')}</span></td>
                <td>{booking.status === 'pending' && editingCafe?.publication_status !== 'archived' && <div className="headerActions">
                  <button className="primaryButton" onClick={() => void updateBooking(booking.id, 'confirmed')}>Confirm</button>
                  <button className="dangerButton" onClick={() => void updateBooking(booking.id, 'rejected')}>Reject</button>
                </div>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    );
  }

  if (isNew || isEdit) {
    const title = editingCafe?.name || editingRevision?.proposed_data.name || 'Add a space';
    return (
      <section className="cafeFormSection">
        {feedback}
        <div className="sectionHeader">
          <div>
            <p className="kicker">{isAdmin ? 'IMMEDIATE PUBLISHING' : `OWNER ${editingRevision?.status ?? 'DRAFT'}`}</p>
            <h2>{title}</h2>
            <p>{isAdmin ? 'Saving changes updates the customer-facing profile immediately.' : 'Save a private draft or submit it for admin approval.'}</p>
          </div>
          <button className="ghostButton" onClick={() => navigate('/owner/cafes')}>← Back</button>
        </div>
        {editingRevision?.status === 'rejected' && editingRevision.review_note && (
          <div className="notice noticeError"><strong>Admin review:</strong> {editingRevision.review_note}</div>
        )}
        <form className="cafeForm" onSubmit={(event) => { event.preventDefault(); void saveProfile(true); }}>
          <CafeProfileForm
            token={token}
            value={formData}
            onChange={setFormData}
            requireGoogle={!editingCafe && !editingRevision?.cafe_id}
            existingProfile={
              editingCafe
                ? profileFromCafe(editingCafe)
                : editingRevision?.live_cafe
                  ? profileFromCafe(editingRevision.live_cafe)
                  : null
            }
          />
          <div className="coverField">
            <div className="coverFieldActions">
              <strong>{isAdmin ? 'Public cover image' : 'Proposed cover image'}</strong>
              <p>{isAdmin ? 'This replaces the public cover immediately.' : 'This remains private until the revision is approved.'}</p>
              {editingRevision?.proposed_cover_preview_url && <img className="revisionCoverPreview" src={editingRevision.proposed_cover_preview_url} alt="Proposed cover" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseCover(event.target.files?.[0])} />
              {coverFile && <small>Ready: {coverFile.name}</small>}
              {!isAdmin && (editingRevision?.live_cafe?.cover_image_url || editingCafe?.cover_image_url) && (
                <label className="filterToggle">
                  <input type="checkbox" checked={Boolean(formData.remove_cover)} onChange={(event) => setFormData((current) => ({ ...current, remove_cover: event.target.checked }))} />
                  <span>Remove the current public cover when approved</span>
                </label>
              )}
              {isAdmin && editingCafe?.cover_image_url && (
                <button className="dangerButton" type="button" onClick={() => void deleteCafeCoverApi(token, editingCafe.id).then(loadData)}>Remove public cover</button>
              )}
            </div>
          </div>
          <div className="formActions">
            <button type="button" className="ghostButton" onClick={() => navigate('/owner/cafes')}>Cancel</button>
            {!isAdmin && <button type="button" className="ghostButton" disabled={formLoading} onClick={() => void saveProfile(false)}>Save draft</button>}
            <button className="primaryButton" disabled={formLoading || (!formData.google_place_id && !editingCafe && !editingRevision?.cafe_id)}>
              {formLoading ? 'Saving…' : isAdmin ? 'Publish changes' : 'Submit for approval'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="dashboardPane">
      {feedback}
      <div className="sectionHeader">
        <div>
          <p className="kicker">{isAdmin ? 'ALL CAFÉ PROFILES' : 'YOUR CAFÉ PROFILES'}</p>
          <h2>{loading ? 'Loading…' : `${cafes.length} live · ${revisions.filter((item) => ['draft', 'pending', 'rejected'].includes(item.status)).length} in progress`}</h2>
        </div>
        <div className="headerActions">
          <div className="statusFilters" aria-label="Café publication filter">
            <button className={publicationFilter === 'published' ? 'active' : ''} onClick={() => setPublicationFilter('published')}>Published</button>
            <button className={publicationFilter === 'archived' ? 'active' : ''} onClick={() => setPublicationFilter('archived')}>Archived</button>
          </div>
          <button className="ghostButton" onClick={() => void loadData()}>Refresh</button>
          <button className="addButton" onClick={() => navigate('/owner/cafes/new')}>+ Add café</button>
        </div>
      </div>

      {!isAdmin && revisions.length > 0 && (
        <div className="revisionList">
          <h3>Drafts and submissions</h3>
          {revisions.filter((item) => item.status !== 'approved' && item.status !== 'withdrawn').map((revision) => (
            <article className="revisionCard" key={revision.id}>
              <div><span className={`statusPill ${revision.status}`}>{revision.status}</span><strong>{revision.proposed_data.name || 'New café'}</strong><small>{revision.action} · updated {new Date(revision.updated_at).toLocaleDateString()}</small></div>
              {revision.review_note && <p>{revision.review_note}</p>}
              <div className="headerActions">
                {revision.action !== 'archive' && <button className="ghostButton" onClick={() => navigate(`/owner/revisions/${revision.id}/edit`)}>Edit</button>}
                {['draft', 'pending'].includes(revision.status) && <button className="dangerButton" onClick={() => void withdraw(revision)}>Withdraw</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {loading ? <div className="emptyState">Loading spaces…</div> : !visibleCafes.length ? (
        <div className="emptyState"><h3>No {publicationFilter} cafés.</h3><p>{publicationFilter === 'published' ? 'Create a full profile to begin.' : 'Archived cafés remain here with read-only history.'}</p></div>
      ) : (
        <div className="manageCafeList">
          {visibleCafes.map((cafe) => {
            const openRevision = revisions.find((revision) => revision.cafe_id === cafe.id && ['draft', 'pending', 'rejected'].includes(revision.status));
            return (
              <article className={`cafeManageCard ${cafe.publication_status}`} key={cafe.id}>
                <WorkspaceCover cafe={cafe} />
                <div className="cafeManageInfo">
                  <p className="kicker">{cafe.publication_status} · VERSION {cafe.version}</p>
                  <h3>{cafe.name}</h3><p>{cafe.area}</p>
                  <div className="workspaceMetrics"><span>LKR {cafe.hourly_rate}/seat/hr</span><span>{cafe.total_slots} seats</span><span>{cafe.wifi_speed_mbps} Mbps</span></div>
                  {openRevision && <span className={`statusPill ${openRevision.status}`}>{openRevision.status} {openRevision.action}</span>}
                </div>
                <div className="cafeManageActions">
                  {cafe.google_maps_url && <a className="googleMapsAdminLink" href={cafe.google_maps_url} target="_blank" rel="noreferrer">Google Maps ↗</a>}
                  <button className="primaryButton" onClick={() => navigate(`/owner/cafes/${cafe.id}/bookings`)}>Bookings</button>
                  <button className="ghostButton" disabled={cafe.publication_status === 'archived'} onClick={() => navigate(openRevision ? `/owner/revisions/${openRevision.id}/edit` : `/owner/cafes/${cafe.id}/edit`)}>Edit profile</button>
                  {isAdmin ? (
                    <>
                      {cafe.publication_status === 'published' && (
                        <button className="dangerButton" disabled={Boolean(openRevision)} onClick={() => void requestArchive(cafe)}>Archive</button>
                      )}
                      <button className="vetoButton" onClick={() => void permanentlyRemoveCafe(cafe)}>Delete permanently</button>
                    </>
                  ) : (
                    <button className="dangerButton" disabled={Boolean(openRevision) || cafe.publication_status === 'archived'} onClick={() => void requestArchive(cafe)}>Request removal</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
