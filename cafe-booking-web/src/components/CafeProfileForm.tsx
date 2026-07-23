import { useEffect, useState } from 'react';
import { importGooglePlaceDetails } from '../api';
import GooglePlaceAutocomplete from './GooglePlaceAutocomplete';
import {
  CAFE_AMENITIES,
  type CafeAmenity,
  type CreateCafeRequest,
  type GooglePlaceImport,
  type OpeningHoursPeriod,
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

const IMPORT_FIELDS = [
  ['location', 'Verified identity and location'],
  ['contact_phone', 'Contact phone'],
  ['website_url', 'Website'],
  ['description', 'Description'],
  ['amenities', 'Google-supported amenities'],
  ['opening_hours', 'Regular opening hours'],
] as const;

type ImportField = typeof IMPORT_FIELDS[number][0];

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
    google_business_status: null,
    google_imported_at: null,
    description: '',
    contact_phone: null,
    contact_email: null,
    website_url: null,
    amenities: [],
    opening_hours: Object.fromEntries(
      DAYS.map((day) => [day, {
        closed: false,
        periods: [{ open_minute: 0, close_minute: 1440 }],
      }])
    ) as CreateCafeRequest['opening_hours'],
    house_rules: '',
    access_instructions: '',
    remove_cover: false,
  };
}

function importAvailable(result: GooglePlaceImport, field: ImportField): boolean {
  if (field === 'location') return true;
  return result.imported_fields.includes(field);
}

export function applyGoogleImport(
  current: CreateCafeRequest,
  result: GooglePlaceImport,
  selected: Set<ImportField>
): CreateCafeRequest {
  const suggestion = result.suggested_profile;
  const next = { ...current };
  if (selected.has('location')) {
    next.name = suggestion.name;
    next.area = suggestion.area;
    next.latitude = suggestion.latitude;
    next.longitude = suggestion.longitude;
    next.google_place_id = suggestion.google_place_id;
    next.google_business_status = suggestion.google_business_status;
    next.google_imported_at = suggestion.google_imported_at;
  }
  if (selected.has('contact_phone') && suggestion.contact_phone) {
    next.contact_phone = suggestion.contact_phone;
  }
  if (selected.has('website_url') && suggestion.website_url) {
    next.website_url = suggestion.website_url;
  }
  if (selected.has('description') && suggestion.description) {
    next.description = suggestion.description;
  }
  if (selected.has('opening_hours') && suggestion.opening_hours) {
    next.opening_hours = suggestion.opening_hours;
  }
  if (selected.has('amenities')) {
    const amenities = new Set(next.amenities);
    Object.entries(suggestion.amenity_evidence).forEach(([amenity, enabled]) => {
      if (enabled === true) amenities.add(amenity as CafeAmenity);
      if (enabled === false) amenities.delete(amenity as CafeAmenity);
    });
    next.amenities = [...amenities];
  }
  next.google_session_token = undefined;
  return next;
}

function MinuteSelect({
  value,
  allowEndOfDay,
  onChange,
}: {
  value: number;
  allowEndOfDay?: boolean;
  onChange: (value: number) => void;
}) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  const maxHour = allowEndOfDay ? 24 : 23;
  return (
    <span className="minuteSelect">
      <select
        aria-label="Hour"
        value={hour}
        onChange={(event) => {
          const nextHour = Number(event.target.value);
          onChange(nextHour === 24 ? 1440 : nextHour * 60 + minute);
        }}
      >
        {Array.from({ length: maxHour + 1 }, (_, index) => (
          <option value={index} key={index}>{String(index).padStart(2, '0')}</option>
        ))}
      </select>
      <span>:</span>
      <select
        aria-label="Minute"
        value={hour === 24 ? 0 : minute}
        disabled={hour === 24}
        onChange={(event) => onChange(hour * 60 + Number(event.target.value))}
      >
        {Array.from({ length: 60 }, (_, index) => (
          <option value={index} key={index}>{String(index).padStart(2, '0')}</option>
        ))}
      </select>
    </span>
  );
}

export default function CafeProfileForm({
  token,
  value,
  onChange,
  requireGoogle,
  existingProfile,
}: {
  token: string;
  value: CreateCafeRequest;
  onChange: (profile: CreateCafeRequest) => void;
  requireGoogle: boolean;
  existingProfile?: CreateCafeRequest | null;
}) {
  const [choosingLocation, setChoosingLocation] = useState(!value.google_place_id);
  const [placeSearch, setPlaceSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<GooglePlaceImport | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<ImportField>>(new Set());

  useEffect(() => {
    if (value.google_place_id && !pendingImport) setChoosingLocation(false);
  }, [pendingImport, value.google_place_id]);

  const set = <K extends keyof CreateCafeRequest>(key: K, next: CreateCafeRequest[K]) => {
    onChange({ ...value, [key]: next });
  };
  const toggleAmenity = (amenity: CafeAmenity) => {
    set('amenities', value.amenities.includes(amenity)
      ? value.amenities.filter((item) => item !== amenity)
      : [...value.amenities, amenity]);
  };

  async function selectPlace(placeId: string, sessionToken: string) {
    setImporting(true);
    setImportError(null);
    try {
      const result = await importGooglePlaceDetails(token, placeId, sessionToken);
      const defaults = new Set<ImportField>(
        IMPORT_FIELDS
          .filter(([field]) => importAvailable(result, field))
          .map(([field]) => field)
      );
      if (existingProfile) {
        setPendingImport(result);
        setSelectedFields(defaults);
      } else {
        onChange(applyGoogleImport(value, result, defaults));
        setWarnings(result.warnings);
        setChoosingLocation(false);
        setPlaceSearch('');
      }
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : 'Could not import Google details');
    } finally {
      setImporting(false);
    }
  }

  function applyPendingImport() {
    if (!pendingImport) return;
    onChange(applyGoogleImport(value, pendingImport, selectedFields));
    setWarnings(pendingImport.warnings);
    setPendingImport(null);
    setChoosingLocation(false);
    setPlaceSearch('');
  }

  return (
    <>
      <div className="formSectionBlock">
        <div className="formSectionHeading">
          <p className="kicker">GOOGLE-VERIFIED LOCATION</p>
          <h3>Location and public identity</h3>
          <p>Selecting a Google result imports every supported detail once. Address and coordinates remain Google-verified.</p>
        </div>
        {value.google_place_id && !choosingLocation ? (
          <div className="googleLinkedStatus linkedLocationSummary">
            <span>✓ Linked to Google Maps</span>
            <small>{value.area}</small>
            {value.google_imported_at && <small>Imported {new Date(value.google_imported_at).toLocaleDateString()}</small>}
            <button type="button" className="textButton" onClick={() => {
              setChoosingLocation(true);
              setPlaceSearch('');
              setImportError(null);
            }}>Choose a different location</button>
          </div>
        ) : (
          <GooglePlaceAutocomplete
            token={token}
            value={placeSearch}
            linkedPlaceId={null}
            onInputChange={setPlaceSearch}
            onSelect={(suggestion, sessionToken) => void selectPlace(suggestion.place_id, sessionToken)}
          />
        )}
        {importing && <p className="fieldHint">Importing full Google Maps details…</p>}
        {importError && <p className="fieldHint warningText" role="alert">{importError}</p>}
        {warnings.map((warning) => <p className="fieldHint warningText" key={warning}>{warning}</p>)}
        {value.google_business_status === 'CLOSED_TEMPORARILY' && !warnings.length && (
          <p className="fieldHint warningText">Google currently lists this café as temporarily closed.</p>
        )}
        {pendingImport && (
          <div className="googleImportPreview">
            <div className="formSectionHeading">
              <p className="kicker">RELINK PREVIEW</p>
              <h3>Choose Google-backed changes</h3>
              <p>Your CafeSurf pricing, capacity, Wi‑Fi, power, rules, and arrival details will not be changed.</p>
            </div>
            {IMPORT_FIELDS.filter(([field]) => importAvailable(pendingImport, field)).map(([field, label]) => (
              <label key={field}>
                <input
                  type="checkbox"
                  checked={selectedFields.has(field)}
                  disabled={field === 'location'}
                  onChange={(event) => {
                    const next = new Set(selectedFields);
                    if (event.target.checked) next.add(field);
                    else next.delete(field);
                    setSelectedFields(next);
                  }}
                />
                <span><strong>{label}</strong>{field === 'location' && <small> Required when relinking</small>}</span>
              </label>
            ))}
            <div className="formActions">
              <button type="button" className="ghostButton" onClick={() => setPendingImport(null)}>Cancel</button>
              <button type="button" className="primaryButton" onClick={applyPendingImport}>Apply selected details</button>
            </div>
          </div>
        )}
        {requireGoogle && !value.google_place_id && (
          <p className="fieldHint warningText">Select and import a Google result before saving this new café.</p>
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
        <div className="formSectionHeading"><p className="kicker">AMENITIES</p><h3>Controlled workspace features</h3><p>Google-supported values are imported when known. Unavailable Google data remains for you to confirm.</p></div>
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
          <p>Google regular hours are imported as a starting point. Multiple and minute-accurate periods are supported.</p>
        </div>
        <div className="hoursEditor">
          {DAYS.map((day) => {
            const schedule = value.opening_hours[day];
            const updateDay = (next: typeof schedule) => set('opening_hours', {
              ...value.opening_hours,
              [day]: next,
            });
            const updatePeriod = (index: number, patch: Partial<OpeningHoursPeriod>) => {
              const periods = schedule.periods.map((period, periodIndex) => (
                periodIndex === index ? { ...period, ...patch } : period
              ));
              updateDay({ ...schedule, periods });
            };
            return (
              <div className="hoursRow hoursRowDetailed" key={day}>
                <strong>{day.slice(0, 3)}</strong>
                <label className="filterToggle">
                  <input
                    type="checkbox"
                    checked={schedule.closed}
                    onChange={(event) => updateDay({
                      closed: event.target.checked,
                      periods: event.target.checked
                        ? []
                        : (schedule.periods.length ? schedule.periods : [{ open_minute: 540, close_minute: 1020 }]),
                    })}
                  />
                  <span>Closed</span>
                </label>
                {!schedule.closed && (
                  <div className="periodList">
                    {schedule.periods.map((period, index) => (
                      <div className="periodRow" key={`${day}-${index}`}>
                        <MinuteSelect value={period.open_minute} onChange={(open_minute) => updatePeriod(index, { open_minute })} />
                        <span>to</span>
                        <MinuteSelect value={period.close_minute} allowEndOfDay onChange={(close_minute) => updatePeriod(index, { close_minute })} />
                        {schedule.periods.length > 1 && (
                          <button type="button" className="textButton" onClick={() => updateDay({
                            ...schedule,
                            periods: schedule.periods.filter((_, periodIndex) => periodIndex !== index),
                          })}>Remove</button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="textButton"
                      disabled={schedule.periods.length >= 8}
                      onClick={() => updateDay({
                        ...schedule,
                        periods: [...schedule.periods, { open_minute: 1080, close_minute: 1260 }],
                      })}
                    >+ Add period</button>
                  </div>
                )}
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
