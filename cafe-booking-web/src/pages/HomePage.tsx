import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCafes } from '../api';
import MotionObjects from '../components/MotionObjects';
import PublicHeader from '../components/PublicHeader';
import Reveal from '../components/Reveal';
import WorkspaceCover from '../components/WorkspaceCover';
import type { Cafe, User } from '../types';

const areas = ['All areas', 'Colombo 03', 'Colombo 07', 'Nawala', 'Rajagiriya', 'Kandy'];

export default function HomePage({
  user,
  onAuth,
  onLogout,
}: {
  user: User | null;
  onAuth: () => void;
  onLogout: () => void;
}) {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [area, setArea] = useState('All areas');
  const [generator, setGenerator] = useState(false);
  const [fastWifi, setFastWifi] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchCafes({
      area: area === 'All areas' ? undefined : area,
      hasGenerator: generator || undefined,
      minWifiSpeed: fastWifi ? 100 : undefined,
    })
      .then((result) => active && setCafes(result))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : 'Could not load spaces'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [area, generator, fastWifi]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cafes;
    return cafes.filter((cafe) =>
      `${cafe.name} ${cafe.area}`.toLowerCase().includes(normalized)
    );
  }, [cafes, query]);

  return (
    <div className="publicPage">
      <PublicHeader user={user} onAuth={onAuth} onLogout={onLogout} />
      <main>
        <section className="heroSection">
          <div className="heroCopy">
            <p className="kicker">FLEXIBLE SPACES FOR PEOPLE WHO BUILD TOGETHER</p>
            <h1>Make room<br /><span>for the work.</span></h1>
            <p className="heroLead">
              Reserve connected, reliable café workspaces for focused sessions,
              team sprints, study groups, and everything between.
            </p>
            <div className="heroActions">
              <a className="pillButton brassButton" href="#spaces">Find a workspace <span>↓</span></a>
              {!user && <button className="textLinkButton" onClick={onAuth}>Save your next session ↗</button>}
            </div>
            <div className="heroProof">
              <span><strong>Live</strong> hourly availability</span>
              <span><strong>1–team</strong> seat-based booking</span>
              <span><strong>LKR</strong> clear per-seat pricing</span>
            </div>
          </div>
          <MotionObjects />
        </section>

        <Reveal>
          <section className="discoverySection" id="spaces">
            <div className="editorialHeading">
              <p className="kicker">SPACES THAT KEEP UP</p>
              <h2>Find your team’s<br /><em>next working rhythm.</em></h2>
              <p>Filter for what matters, then choose a time and the number of seats you need.</p>
            </div>

            <div className="filterBar" aria-label="Workspace filters">
              <label>
                <span>Search</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or area" />
              </label>
              <label>
                <span>Area</span>
                <select value={area} onChange={(event) => setArea(event.target.value)}>
                  {areas.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="filterToggle">
                <input type="checkbox" checked={fastWifi} onChange={(event) => setFastWifi(event.target.checked)} />
                <span>100+ Mbps</span>
              </label>
              <label className="filterToggle">
                <input type="checkbox" checked={generator} onChange={(event) => setGenerator(event.target.checked)} />
                <span>Backup power</span>
              </label>
            </div>

            {error && <div className="notice noticeError" role="alert">{error}</div>}
            <div className="workspaceCards">
              {loading && [0, 1, 2].map((item) => <div className="workspaceCard skeleton" key={item} />)}
              {!loading && filtered.map((cafe, index) => (
                <Link className="workspaceCard" to={`/spaces/${cafe.id}`} key={cafe.id}>
                  <WorkspaceCover cafe={cafe} />
                  <div className="workspaceCardBody">
                    <div className="cardIndex">{String(index + 1).padStart(2, '0')}</div>
                    <div>
                      <p className="kicker">{cafe.area}</p>
                      <h3>{cafe.name}</h3>
                    </div>
                    <div className="workspaceMetrics">
                      <span>{cafe.total_slots} seats</span>
                      <span>{cafe.wifi_speed_mbps} Mbps</span>
                      <span>{cafe.has_generator ? 'Backup power' : 'Grid power'}</span>
                    </div>
                    <div className="cardPrice">
                      <span>From</span>
                      <strong>LKR {cafe.hourly_rate.toLocaleString()}</strong>
                      <small>seat / hour</small>
                    </div>
                    <span className="roundArrow">↗</span>
                  </div>
                </Link>
              ))}
            </div>
            {!loading && !filtered.length && (
              <div className="emptyPanel"><strong>No matching spaces.</strong><span>Try a broader area or fewer filters.</span></div>
            )}
          </section>
        </Reveal>

        <Reveal>
          <section className="benefitSection">
            <div className="darkEditorialCard">
              <p className="kicker">WORK BETTER, TOGETHER</p>
              <h2>Everything your session needs.<br /><em>Nothing it doesn’t.</em></h2>
              <div className="benefitGrid">
                <article><span>01</span><h3>Seats together</h3><p>Availability reflects your whole team, not just one reservation.</p></article>
                <article><span>02</span><h3>Reliable connection</h3><p>Compare Wi‑Fi speed and backup-power options before you arrive.</p></article>
                <article><span>03</span><h3>Flexible timing</h3><p>Select a continuous block and see your exact per-seat total instantly.</p></article>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="stepsSection" id="how-it-works">
            <div className="editorialHeading compactHeading">
              <p className="kicker">THREE SIMPLE MOVES</p>
              <h2>From idea to<br /><em>shared table.</em></h2>
            </div>
            <ol className="stepsList">
              <li><span>01</span><div><h3>Choose the right space</h3><p>Compare area, seats, connection, power, and per-seat pricing.</p></div></li>
              <li><span>02</span><div><h3>Set time and team size</h3><p>Live availability checks that everyone can sit together.</p></div></li>
              <li><span>03</span><div><h3>Send the request</h3><p>The café confirms your session, then your group is ready to arrive.</p></div></li>
            </ol>
          </section>
        </Reveal>

        <section className="ownerCta">
          <div>
            <p className="kicker">FOR WORKSPACE PARTNERS</p>
            <h2>Turn open seats into<br />productive hours.</h2>
          </div>
          {user?.role === 'customer' ? (
            <Link className="pillButton porcelainButton" to="/owner/apply">Become a partner ↗</Link>
          ) : !user ? (
            <button className="pillButton porcelainButton" onClick={onAuth}>Start with CafeSurf ↗</button>
          ) : (
            <Link className="pillButton porcelainButton" to="/owner/cafes">Open workspace console ↗</Link>
          )}
        </section>
      </main>
      <footer className="siteFooter">
        <div><strong>CafeSurf</strong><span>Flexible workspace for teams across Sri Lanka.</span></div>
        <a href="#spaces">Find a space</a>
        <a href="#how-it-works">How it works</a>
        <span>© {new Date().getFullYear()} CafeSurf</span>
      </footer>
    </div>
  );
}
