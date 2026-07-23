import { useEffect, useRef, type ReactNode } from 'react';

export default function ScrollChapter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const touch = window.matchMedia('(max-width: 819px), (pointer: coarse)');
    if (reduced.matches || touch.matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const range = Math.max(1, element.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / range));
      element.style.setProperty('--chapter-progress', progress.toFixed(4));
      const presence = progress < .65 ? 1 : 1 - ((progress - .65) / .35) * .68;
      element.style.setProperty('--chapter-presence', presence.toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return <div className={`scrollChapter ${className}`} ref={ref}><div className="scrollChapterStage">{children}</div></div>;
}
