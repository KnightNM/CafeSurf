import { useEffect, useMemo, useState } from 'react';
import { decideCafeRevisionApi, fetchAdminCafeRevisions } from './api';
import type { CafeRevision, CafeRevisionStatus } from './types';

const LABELS: Record<string, string> = {
  name: 'Display name',
  area: 'Verified address',
  latitude: 'Latitude',
  longitude: 'Longitude',
  hourly_rate: 'Rate per seat / hour',
  total_slots: 'Capacity',
  has_generator: 'Backup power',
  wifi_speed_mbps: 'Wi‑Fi speed',
  google_place_id: 'Google Place ID',
  google_business_status: 'Google business status',
  google_imported_at: 'Google import date',
  description: 'Description',
  contact_phone: 'Contact phone',
  contact_email: 'Contact email',
  website_url: 'Website',
  amenities: 'Amenities',
  opening_hours: 'CafeSurf operating hours',
  house_rules: 'House rules',
  access_instructions: 'Access instructions',
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function AdminCafeRevisions({ token }: { token: string }) {
  const [status, setStatus] = useState<CafeRevisionStatus>('pending');
  const [revisions, setRevisions] = useState<CafeRevision[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => revisions.find((item) => item.id === selectedId) ?? revisions[0] ?? null, [revisions, selectedId]);

  async function load() {
    setLoading(true);
    try {
      const result = await fetchAdminCafeRevisions(token, status);
      setRevisions(result);
      setSelectedId((current) => result.some((item) => item.id === current) ? current : result[0]?.id ?? null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load café revisions');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [token, status]);

  async function decide(decision: 'approved' | 'rejected') {
    if (!selected) return;
    if (decision === 'rejected' && !reviewNote.trim()) {
      setError('Add a review note so the owner knows what to revise.');
      return;
    }
    try {
      await decideCafeRevisionApi(token, selected.id, decision, reviewNote);
      setReviewNote('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not review revision');
    }
  }

  const fields = selected ? Object.keys(LABELS).filter((key) => {
    const proposed = selected.proposed_data?.[key as keyof typeof selected.proposed_data];
    const live = selected.live_cafe?.[key as keyof typeof selected.live_cafe];
    return selected.action === 'create' || display(proposed) !== display(live);
  }) : [];

  return (
    <section className="adminReviewPage">
      <div className="sectionHeader">
        <div><p className="kicker">PUBLICATION CONTROL</p><h2>Café profile revisions.</h2></div>
        <div className="statusFilters">
          {(['pending', 'approved', 'rejected'] as CafeRevisionStatus[]).map((item) => (
            <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item}</button>
          ))}
        </div>
      </div>
      {error && <div className="notice noticeError" role="alert">{error}<button onClick={() => setError(null)}>×</button></div>}
      {loading ? <div className="emptyState">Loading review queue…</div> : !revisions.length ? (
        <div className="emptyState"><h3>No {status} revisions.</h3></div>
      ) : (
        <div className="reviewWorkspace">
          <aside className="reviewQueue">
            {revisions.map((revision) => (
              <button className={selected?.id === revision.id ? 'active' : ''} key={revision.id} onClick={() => { setSelectedId(revision.id); setReviewNote(''); }}>
                <span className={`statusPill ${revision.status}`}>{revision.action}</span>
                <strong>{revision.proposed_data.name || revision.live_cafe?.name || 'Café removal'}</strong>
                <small>{revision.owner_name} · {revision.submitted_at ? new Date(revision.submitted_at).toLocaleDateString() : 'No submission date'}</small>
              </button>
            ))}
          </aside>
          {selected && (
            <article className="reviewDetail">
              <div className="reviewTitle">
                <div><p className="kicker">{selected.action} REQUEST</p><h3>{selected.proposed_data.name || selected.live_cafe?.name}</h3><p>{selected.owner_name} · {selected.owner_email}</p></div>
                <span className={`statusPill ${selected.status}`}>{selected.status}</span>
              </div>
              {selected.action === 'archive' ? (
                <div className="archiveWarning"><strong>Archive request</strong><p>Approval unpublishes the café and cancels future pending and confirmed bookings while preserving all history.</p></div>
              ) : (
                <>
                  {(selected.live_cafe?.cover_image_url || selected.proposed_cover_preview_url) && (
                    <div className="coverComparison">
                      <div><span>Current cover</span>{selected.live_cafe?.cover_image_url ? <img src={selected.live_cafe.cover_image_url} alt="Current cover" /> : <div>No cover</div>}</div>
                      <div><span>Proposed cover</span>{selected.proposed_cover_preview_url ? <img src={selected.proposed_cover_preview_url} alt="Proposed cover" /> : <div>No cover change</div>}</div>
                    </div>
                  )}
                  <div className="fieldDiffTable">
                    <div className="diffHeader"><span>Field</span><span>Current approved</span><span>Proposed</span></div>
                    {fields.map((key) => (
                      <div className="diffRow" key={key}>
                        <strong>{LABELS[key]}</strong>
                        <span>{selected.action === 'create' ? 'New café' : display(selected.live_cafe?.[key as keyof typeof selected.live_cafe])}</span>
                        <span>{display(selected.proposed_data[key as keyof typeof selected.proposed_data])}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {selected.status === 'pending' ? (
                <div className="reviewDecision">
                  <label>Review note<textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} maxLength={2000} placeholder="Required when rejecting; optional when approving" /></label>
                  <div className="formActions">
                    <button className="dangerButton" onClick={() => void decide('rejected')}>Reject with note</button>
                    <button className="primaryButton" onClick={() => void decide('approved')}>Approve and publish</button>
                  </div>
                </div>
              ) : selected.review_note && <div className="notice"><strong>Review note:</strong> {selected.review_note}</div>}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
