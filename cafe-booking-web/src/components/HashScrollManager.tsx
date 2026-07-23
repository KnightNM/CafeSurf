import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function HashScrollManager() {
  const location = useLocation();
  useEffect(() => {
    const id = location.hash.replace(/^#/, '');
    if (!id) return;
    let attempts = 0;
    let frame = 0;
    const findAndScroll = () => {
      const target = document.getElementById(id);
      if (!target && attempts++ < 20) {
        frame = window.requestAnimationFrame(findAndScroll);
        return;
      }
      if (!target) return;
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      const heading = target.matches('h1,h2,h3') ? target : target.querySelector<HTMLElement>('h1,h2,h3');
      heading?.focus({ preventScroll: true });
    };
    frame = window.requestAnimationFrame(findAndScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  return null;
}
