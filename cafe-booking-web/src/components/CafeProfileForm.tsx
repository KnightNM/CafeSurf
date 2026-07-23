import GooglePlaceAutocomplete from './GooglePlaceAutocomplete';
import {
  CAFE_AMENITIES,
  type CafeAmenity,
  type CreateCafeRequest,
  type Weekday,
} from '../types';

const DAYS: Weekday[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const AMENITY_LABELS: Record<CafeAmenity, string> = {
  air_conditioning: 'Air conditioning',
  parking: 'Parking',
  wheelchair_access: 'Wheelchair access',
  quiet_zone: 'Quiet zone',
  meeting_room: 'Meeting room',
  whiteboard: 'Whiteboard',
  power_outlets: 'Power outlets',
  food_available: 'Food available',
  outdoor_seating: 'Outdoor seating',
};

export function createEmptyProfile(): CreateCafeRequest {
  return {
    name: '',
    area: '',
    latitude: 0,
    longitude: 0,
    hourly_rate: 0,
    total_slots: 1,
    has_generator: false,
    wifi_speed_mbps: 50,
    google_place_id: null,
    description: '',
    contact_phone: null,
    contact_email: null,
    website_url: null,
    amenities: [],
    opening_hours: Object.fromEntries(
      DAYS.map((day) => [day, { closed: false, open: 0, close: 24 }])
    ) as CreateCafeRequest['opening_hours'],
    house_rules: '',
    access_instructions: '',
    remove_cover: false,
  };
}

export default function CafeProfileForm({
  token,
  value,
  onChange,
  requireGoogle,
}: {
  token: string;
  value: CreateCafeRequest;
  onChange: (profile: CreateCafeRequest) => void;
  requireGoogle: boolean;
}) {
  const set = <K extends keyof CreateCafeRequest>(key: K, next: CreateCafeRequest[K]) => {
    onChange({ ...value, [key]: next });
  };
  const toggleAmenity = (amenity: CafeAmenity) => {
    set('amenities', value.amenities.includes(amenity)
      ? value.amenities.filter((item) => item !== amenity)
      : [...value.amenities, amenity]);
  };

  return (
    <>
      <div className="formSectionBlock">
        <div className="formSectionHeading">
          <p className="kicker">GOOGLE-VERIFIED LOCATION</p>
          <h3>Location and public identity</h3>
          <p>The display name stays editable. Google controls the verified address and coordinates.</p>
        </div>
        {value.google_place_id ? (
          <div className="googleLinkedStatus linkedLocationSummary">
            <span>✓ Linked to Google Maps</span>
            <small>{value.area}</small>
            <button type="button" className="textButton" onClick={() => onChange({
              ...value,
              google_place_id: null,
              google_session_token: undefined,
              area: '',
              latitude: 0,
              longitude: 0,
            })}>Choose a different location</button>
          </div>
        ) : (
          <GooglePlaceAutocomplete
            token={token}
            value={value.name}
            linkedPlaceId={null}
            onInputChange={(name) => set('name', name)}
            onSelect={(suggestion, google_session_token) => onChange({
              ...value,
              name: suggestion.name,
              area: suggestion.address,
              google_place_id: suggestion.place_id,
              google_session_token,
            })}
          />
        )}
        {requireGoogle && !value.google_place_id && (
          <p className="fieldHint warningText">Select a Google result before saving this new café.</p>
        )}
        <div className="formGrid">
          <label>Public display name<input value={value.name} onChange={(event) => set('name', event.target.value)} required /></label>
          <label className="spanTwo">Verified address<input value={value.area} readOnly required /></label>
          <label>Latitude<input value={value.latitude || ''} readOnly /></label>
          <label>Longitude<input value={value.longitude || ''} readOnly /></label>
        </div>
      </div>

      <div className="formSectionBlock">
        <div className="formSectionHeading"><p className="kicker">PROFILE</p><h3>What teams should know</h3></div>
        <label className="fullField">Description<textarea rows={5} maxLength={3000} value={value.description} onChange={(event) => set('description', event.target.value)} /></label>
        <div className="formGrid">
          <label>Contact phone<input value={value.contact_phone ?? ''} onChange={(event) => set('contact_phone', event.target.value || null)} /></label>
          <label>Contact email<input type="email" value={value.contact_email ?? ''} onChange={(event) => set('contact_email', event.target.value || null)} /></label>
          <label className="spanTwo">Website<input type="url" value={value.website_url ?? ''} onChange={(event) => set('website_url', event.target.value || null)} placeholder="https://" /></label>
          <label>Rate per seat / hour (LKR)<input type="number" min="0" value={value.hourly_rate || ''} onChange={(event) => set('hourly_rate', Number(event.target.value))} required /></label>
          <label>Total seats<input type="number" min="1" value={value.total_slots || ''} onChange={(event) => set('total_slots', Number(event.target.value))} required /></label>
          <label>Wi‑Fi speed (Mbps)<input type="number" min="0" value={value.wifi_speed_mbps} onChange={(event) => set('wifi_speed_mbps', Number(event.target.value))} required /></label>
          <label className="filterToggle"><input type="checkbox" checked={value.has_generator} onChange={(event) => set('has_generator', event.target.checked)} /><span>Backup power available</span></label>
        </div>
      </div>

      <div className="formSectionBlock">
        <div className="formSectionHeading"><p className="kicker">AMENITIES</p><h3>Controlled workspace features</h3></div>
        <div className="amenityChecklist">
          {CAFE_AMENITIES.map((amenity) => (
            <label key={amenity}>
              <input type="checkbox" checked={value.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
              <span>{AMENITY_LABELS[amenity]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="formSectionBlock">
        <div className="formSectionHeading">
          <p className="kicker">CAFESURF HOURS</p>
          <h3>Hours that control booking</h3>
          <p>Google hours are informational. These hours determine availability and validation.</p>
        </div>
        <div className="hoursEditor">
          {DAYS.map((day) => {
            const schedule = value.opening_hours[day];
            const updateDay = (patch: Partial<typeof schedule>) => set('opening_hours', {
              ...value.opening_hours,
              [day]: { ...schedule, ...patch },
            });
            return (
              <div className="hoursRow" key={day}>
                <strong>{day.slice(0, 3)}</strong>
                <label className="filterToggle"><input type="checkbox" checked={schedule.closed} onChange={(event) => updateDay({ closed: event.target.checked })} /><span>Closed</span></label>
                <label>Open<input type="number" min="0" max="23" value={schedule.open} disabled={schedule.closed} onChange={(event) => updateDay({ open: Number(event.target.value) })} /></label>
                <label>Close<input type="number" min="1" max="24" value={schedule.close} disabled={schedule.closed} onChange={(event) => updateDay({ close: Number(event.target.value) })} /></label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="formSectionBlock">
        <div className="formSectionHeading"><p className="kicker">ARRIVAL</p><h3>Rules and access</h3></div>
        <div className="formGrid">
          <label className="spanTwo">House rules<textarea rows={5} maxLength={3000} value={value.house_rules} onChange={(event) => set('house_rules', event.target.value)} /></label>
          <label className="spanTwo">Access and arrival instructions<textarea rows={5} maxLength={3000} value={value.access_instructions} onChange={(event) => set('access_instructions', event.target.value)} /></label>
        </div>
      </div>
    </>
  );
}
