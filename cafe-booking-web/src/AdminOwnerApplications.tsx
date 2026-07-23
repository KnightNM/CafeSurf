import { useEffect, useState } from 'react';
import { decideOwnerApplicationApi, fetchOwnerApplications } from './api';
import type { OwnerApplication, OwnerApplicationStatus } from './types';

interface AdminOwnerApplicationsProps {
  token: string;
}

export default function AdminOwnerApplications({ token }: AdminOwnerApplicationsProps) {
  const [status, setStatus] = useState<OwnerApplicationStatus>('pending');
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      setApplications(await fetchOwnerApplications(token, status));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load owner applications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, [token, status]);

  async function decide(application: OwnerApplication, decision: 'approved' | 'rejected') {
    setError(null);
    setNotice(null);
    try {
      await decideOwnerApplicationApi(token, application.id, decision, reviewNotes[application.id]);
      setNotice(`Application ${decision}.`);
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
      await loadApplications();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not review application');
    }
  }

  return (
    <section className="dashboardPane applicationPane">
      <div className="sectionHeader">
        <div>
          <p className="kicker">PARTNER OPERATIONS</p>
          <h2>Owner applications.</h2>
        </div>
        <div className="headerActions">
          <select value={status} onChange={(event) => setStatus(event.target.value as OwnerApplicationStatus)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="ghostButton" onClick={() => void loadApplications()}>Refresh</button>
        </div>
      </div>

      {error && <div className="toast error"><span>{error}</span></div>}
      {notice && <div className="toast"><span>{notice}</span></div>}
      {loading && <div className="emptyState"><p>Loading applications…</p></div>}
      {!loading && applications.length === 0 && (
        <div className="emptyState"><h3>No {status} applications</h3></div>
      )}

      <div className="applicationList">
        {applications.map((application) => (
          <article className="applicationCard" key={application.id}>
            <div className="applicationStatusRow">
              <div>
                <h3>{application.business_name}</h3>
                <p>{application.applicant_name} · {application.applicant_email}</p>
              </div>
              <span className={`status ${application.status}`}>{application.status}</span>
            </div>
            <p><strong>Café:</strong> {application.cafe_name}</p>
            <p><strong>Location:</strong> {application.location}</p>
            <p><strong>Phone:</strong> {application.contact_phone}</p>
            {application.notes && <p><strong>Notes:</strong> {application.notes}</p>}
            {application.review_note && <p><strong>Review note:</strong> {application.review_note}</p>}
            {application.status === 'pending' && (
              <div className="reviewComposer">
                <input
                  value={reviewNotes[application.id] ?? ''}
                  onChange={(event) => setReviewNotes((current) => ({
                    ...current,
                    [application.id]: event.target.value,
                  }))}
                  maxLength={1000}
                  placeholder="Optional review note"
                  aria-label={`Review note for ${application.business_name}`}
                />
                <button className="primaryButton" onClick={() => void decide(application, 'approved')}>Approve</button>
                <button className="dangerButton" onClick={() => void decide(application, 'rejected')}>Reject</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
