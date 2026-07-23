import { useEffect, useRef } from 'react';

export default function MotionObjects() {
  const ref = useRef<HTMLDivElement | null>(null);

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
    <div className="motionStage" ref={ref} aria-hidden="true">
      <div className="motionGrid" />
      <div className="floatObject calendarObject">
        <span className="objectKicker">NEXT SESSION</span>
        <strong>Wed · 10:00</strong>
        <span className="calendarLine" />
        <span>Design sprint · 4 people</span>
      </div>
      <div className="floatObject teamObject">
        <span className="avatar avatarOne">N</span>
        <span className="avatar avatarTwo">A</span>
        <span className="avatar avatarThree">+2</span>
        <strong>Team ready</strong>
      </div>
      <div className="floatObject signalObject">
        <span className="signalGlyph">⌁</span>
        <div><strong>120 Mbps</strong><span>focus-ready Wi‑Fi</span></div>
      </div>
      <div className="floatObject seatsObject">
        <span>AVAILABLE</span>
        <strong>06</strong>
        <small>seats together</small>
      </div>
      <div className="cursorObject"><span>Book this space</span></div>
    </div>
  );
}
