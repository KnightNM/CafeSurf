import { useEffect, useState } from 'react';
import {
  createOwnerApplicationApi,
  fetchMyOwnerApplication,
} from './api';
import type {
  CreateOwnerApplicationRequest,
  OwnerApplication,
  UserRole,
} from './types';

interface OwnerApplicationViewProps {
  token: string;
  currentRole: UserRole;
  onProfileChanged: () => void;
}

const EMPTY_FORM: CreateOwnerApplicationRequest = {
  business_name: '',
  contact_phone: '',
  cafe_name: '',
  location: '',
  notes: '',
};

export default function OwnerApplicationView({
  token,
  currentRole,
  onProfileChanged,
}: OwnerApplicationViewProps) {
  const [application, setApplication] = useState<OwnerApplication | null>(null);
  const [form, setForm] = useState<CreateOwnerApplicationRequest>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadApplication() {
    setLoading(true);
    setError(null);
    try {
      setApplication(await fetchMyOwnerApplication(token));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your application');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplication();
  }, [token]);

  useEffect(() => {
    if (application?.status === 'approved' && currentRole === 'customer') {
      onProfileChanged();
    }
  }, [application?.status, currentRole]);

  function setField<K extends keyof CreateOwnerApplicationRequest>(
    key: K,
    value: CreateOwnerApplicationRequest[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setApplication(await createOwnerApplicationApi(token, form));
      setForm(EMPTY_FORM);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit your application');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="dashboardPane applicationPane">
      <div className="sectionHeader">
        <div>
          <p className="kicker">PARTNER WITH CAFESURF</p>
          <h2>List your workspace.</h2>
        </div>
        <button className="ghostButton" onClick={() => void loadApplication()}>Refresh</button>
      </div>

      {error && <div className="toast error"><span>{error}</span></div>}
      {loading && <div className="emptyState"><p>Loading your application…</p></div>}

      {!loading && application && (
        <article className="applicationCard">
          <div className="applicationStatusRow">
            <h3>{application.business_name}</h3>
            <span className={`status ${application.status}`}>{application.status}</span>
          </div>
          <p><strong>Proposed café:</strong> {application.cafe_name}</p>
          <p><strong>Location:</strong> {application.location}</p>
          <p><strong>Contact:</strong> {application.contact_phone}</p>
          {application.notes && <p><strong>Notes:</strong> {application.notes}</p>}
          {application.review_note && <p><strong>Review note:</strong> {application.review_note}</p>}
          {application.status === 'pending' && <p>An administrator will review your application.</p>}
          {application.status === 'approved' && <p>Your owner access is ready.</p>}
          {application.status === 'rejected' && (
            <button className="primaryButton" onClick={() => setApplication(null)}>Submit a new application</button>
          )}
        </article>
      )}

      {!loading && !application && (
        <form className="cafeForm applicationForm" onSubmit={submit}>
          <label>
            Business name
            <input value={form.business_name} minLength={2} maxLength={150} required
              onChange={(event) => setField('business_name', event.target.value)} />
          </label>
          <label>
            Contact phone
            <input value={form.contact_phone} minLength={7} maxLength={30} required
              onChange={(event) => setField('contact_phone', event.target.value)} />
          </label>
          <label>
            Proposed café name
            <input value={form.cafe_name} minLength={2} maxLength={150} required
              onChange={(event) => setField('cafe_name', event.target.value)} />
          </label>
          <label>
            Location
            <input value={form.location} minLength={2} maxLength={200} required
              onChange={(event) => setField('location', event.target.value)} />
          </label>
          <label className="fullWidth">
            Notes (optional)
            <textarea value={form.notes} maxLength={1000} rows={5}
              onChange={(event) => setField('notes', event.target.value)} />
          </label>
          <button className="primaryButton" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      )}
    </section>
  );
}
