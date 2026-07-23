import { useEffect, useRef, useState } from 'react';
import { autocompleteGooglePlaces } from '../api';
import type { GooglePlaceSuggestion } from '../types';

interface GooglePlaceAutocompleteProps {
  token: string;
  value: string;
  linkedPlaceId?: string | null;
  onInputChange: (value: string) => void;
  onSelect: (suggestion: GooglePlaceSuggestion, sessionToken: string) => void;
}

function newSessionToken(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export default function GooglePlaceAutocomplete({
  token,
  value,
  linkedPlaceId,
  onInputChange,
  onSelect,
}: GooglePlaceAutocompleteProps) {
  const sessionToken = useRef(newSessionToken());
  const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionMade, setSelectionMade] = useState(Boolean(linkedPlaceId));

  useEffect(() => {
    setSelectionMade(Boolean(linkedPlaceId));
  }, [linkedPlaceId]);

  useEffect(() => {
    const input = value.trim();
    if (selectionMade || input.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      autocompleteGooglePlaces(token, input, sessionToken.current)
        .then((result) => active && setSuggestions(result))
        .catch((caught) => {
          if (!active) return;
          setSuggestions([]);
          setError(caught instanceof Error ? caught.message : 'Could not search Google Maps');
        })
        .finally(() => active && setLoading(false));
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectionMade, token, value]);

  function updateValue(next: string) {
    setSelectionMade(false);
    onInputChange(next);
  }

  function selectSuggestion(suggestion: GooglePlaceSuggestion) {
    const completedToken = sessionToken.current;
    setSelectionMade(true);
    setSuggestions([]);
    onSelect(suggestion, completedToken);
    sessionToken.current = newSessionToken();
  }

  return (
    <div className="googlePlaceField">
      <label htmlFor="google-place-search">
        Find the café on Google Maps
        <input
          id="google-place-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls="google-place-suggestions"
          autoComplete="off"
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          placeholder="Start typing the café name"
        />
      </label>
      {loading && <small>Searching Google Maps…</small>}
      {error && <small className="fieldError">{error}</small>}
      {linkedPlaceId && (
        <div className="googleLinkedStatus">
          <span>✓ Linked to Google Maps</span>
          <small>Changing the name lets you choose a different location.</small>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="placeSuggestions" id="google-place-suggestions" role="listbox">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              role="option"
              onClick={() => selectSuggestion(suggestion)}
            >
              <strong>{suggestion.name}</strong>
              <span>{suggestion.address}</span>
            </button>
          ))}
          <div className="googleAttribution">Suggestions provided by Google Maps</div>
        </div>
      )}
    </div>
  );
}
