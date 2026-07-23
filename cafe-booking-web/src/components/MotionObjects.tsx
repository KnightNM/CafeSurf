import { useEffect, useRef } from 'react';
import { hourLabel } from '../lib/format';
import type { HomeSummary } from '../types';

function content(summary: HomeSummary | null): {
  kicker: string; title: string; detail: string; metric: string; metricLabel: string; signal: string; signalLabel: string; action: string;
} {
  if (!summary || summary.empty) return {
    kicker: 'LIVE CAFESURF DATA', title: 'No session scheduled', detail: 'Explore published workspaces',
    metric: '—', metricLabel: 'seats available', signal: '—', signalLabel: 'live Wi‑Fi data', action: 'Find a workspace',
  };
  if (summary.kind === 'customer' && summary.booking) return {
    kicker: 'YOUR NEXT SESSION', title: `${summary.booking.date} · ${hourLabel(summary.booking.start_time)}`,
    detail: `${summary.booking.cafe_name} · ${summary.booking.team_size} people`,
    metric: String(summary.booking.team_size).padStart(2, '0'), metricLabel: 'seats reserved',
    signal: summary.booking.status, signalLabel: 'booking status', action: 'View your booking',
  };
  if (summary.kind === 'owner') return {
    kicker: 'OWNER PULSE', title: `${summary.pending_bookings} pending request${summary.pending_bookings === 1 ? '' : 's'}`,
    detail: summary.next_request ? `${summary.next_request.cafe_name} · ${summary.next_request.date}` : 'No booking requests waiting',
    metric: String(summary.published_cafes).padStart(2, '0'), metricLabel: 'published cafés',
    signal: String(summary.pending_bookings), signalLabel: 'requests to review', action: 'Open operations',
  };
  if (summary.kind === 'admin') return {
    kicker: 'PLATFORM PULSE', title: `${summary.bookings_today} booking${summary.bookings_today === 1 ? '' : 's'} today`,
    detail: `${summary.pending_cafe_revisions} café revisions · ${summary.pending_owner_applications} owner applications`,
    metric: String(summary.published_cafes).padStart(2, '0'), metricLabel: 'published cafés',
    signal: String(summary.pending_cafe_revisions), signalLabel: 'profiles to review', action: 'Open review queue',
  };
  const publicData = summary.kind === 'customer' ? summary.fallback : summary;
  if (publicData?.kind === 'public' && !publicData.empty) return {
    kicker: 'NEXT REAL OPENING', title: `${publicData.date} · ${hourLabel(publicData.next_hour ?? 0)}`,
    detail: publicData.cafe_name ?? 'Published workspace',
    metric: String(publicData.available_seats ?? 0).padStart(2, '0'), metricLabel: 'seats available',
    signal: `${publicData.wifi_speed_mbps ?? 0} Mbps`, signalLabel: 'listed Wi‑Fi speed',
    action: `LKR ${(publicData.hourly_rate ?? 0).toLocaleString()} / seat / hour`,
  };
  return content(null);
}

export default function MotionObjects({ summary }: { summary: HomeSummary | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const data = content(summary);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    function move(event: PointerEvent) {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      element?.style.setProperty('--pointer-x', x.toFixed(3));
      element?.style.setProperty('--pointer-y', y.toFixed(3));
    }
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return (
    <div className="motionStage" ref={ref}>
      <p className="srOnly" aria-live="polite">{data.kicker}. {data.title}. {data.detail}. {data.metric} {data.metricLabel}. {data.signal} {data.signalLabel}.</p>
      <div className="motionDecorations" aria-hidden="true">
        <div className="motionGrid" />
        <div className="floatObject calendarObject">
        <span className="objectKicker">{data.kicker}</span>
        <strong>{data.title}</strong>
        <span className="calendarLine" />
        <span>{data.detail}</span>
      </div>
      <div className="floatObject teamObject">
        <span className="avatar avatarOne">C</span>
        <span className="avatar avatarTwo">S</span>
        <span className="avatar avatarThree">↗</span>
        <strong>Live system data</strong>
      </div>
      <div className="floatObject signalObject">
        <span className="signalGlyph">⌁</span>
        <div><strong>{data.signal}</strong><span>{data.signalLabel}</span></div>
      </div>
      <div className="floatObject seatsObject">
        <span>AVAILABLE</span>
        <strong>{data.metric}</strong>
        <small>{data.metricLabel}</small>
      </div>
      <div className="cursorObject"><span>{data.action}</span></div>
      </div>
    </div>
  );
}
