import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Cafe } from '../types';
import WorkspaceCover from './WorkspaceCover';

const cafe: Cafe = {
  id: 'cafe-id',
  owner_id: null,
  name: 'Focus House',
  area: 'Colombo 07',
  latitude: 6.9,
  longitude: 79.8,
  hourly_rate: 500,
  total_slots: 8,
  has_generator: true,
  wifi_speed_mbps: 120,
  google_place_id: null,
  google_business_status: null,
  google_imported_at: null,
  google_maps_url: null,
      cover_image_url: null,
      description: '',
      contact_phone: null,
      contact_email: null,
      website_url: null,
      amenities: [],
      opening_hours: {
        monday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
        tuesday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
        wednesday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
        thursday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
        friday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
        saturday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
        sunday: { closed: false, periods: [{ open_minute: 0, close_minute: 1440 }] },
      },
      house_rules: '',
      access_instructions: '',
      publication_status: 'published',
      version: 1,
};

describe('WorkspaceCover', () => {
  it('renders a deterministic abstract cover without photography', () => {
    const markup = renderToStaticMarkup(<WorkspaceCover cafe={cafe} />);
    expect(markup).toContain('workspaceCoverAbstract');
    expect(markup).toContain('08 seats');
    expect(markup).not.toContain('<img');
  });

  it('renders the real workspace cover when one is available', () => {
    const markup = renderToStaticMarkup(
      <WorkspaceCover cafe={{ ...cafe, cover_image_url: 'https://example.com/cover.webp' }} />
    );
    expect(markup).toContain('https://example.com/cover.webp');
    expect(markup).toContain('Focus House workspace');
  });
});
