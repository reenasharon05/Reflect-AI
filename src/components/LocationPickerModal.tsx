import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Check, Trash2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { EntryLocation, PlaceSuggestion } from '../types';
import { MapPinView } from './MapPinView';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: EntryLocation;
  onSaveLocation: (location: EntryLocation | undefined) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSaveLocation
}) => {
  const [placeName, setPlaceName] = useState(currentLocation?.placeName || '');
  const [placeId, setPlaceId] = useState<string | undefined>(currentLocation?.placeId);
  const [address, setAddress] = useState(currentLocation?.address || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Session token for Google Places Autocomplete grouping
  const sessionTokenRef = useRef<string>(Math.random().toString(36).substring(2, 15));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPlaceName(currentLocation?.placeName || '');
      setPlaceId(currentLocation?.placeId);
      setAddress(currentLocation?.address || '');
      setSearchQuery('');
      setSuggestions([]);
      setShowDropdown(false);
      setStatusMessage(null);
      setErrorMessage(null);
      sessionTokenRef.current = Math.random().toString(36).substring(2, 15);
    }
  }, [isOpen, currentLocation]);

  // Live Autocomplete as user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(trimmed)}&sessiontoken=${sessionTokenRef.current}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.predictions)) {
            setSuggestions(data.predictions);
            setShowDropdown(data.predictions.length > 0);
          } else {
            setSuggestions([]);
            setShowDropdown(false);
          }
        }
      } catch (err) {
        console.warn('Autocomplete fetch failed:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Handle selecting a place suggestion
  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    setPlaceName(suggestion.name);
    setPlaceId(suggestion.placeId);
    setAddress(suggestion.secondaryText || suggestion.description || '');
    setSearchQuery(suggestion.name);
    setShowDropdown(false);
    setStatusMessage(`Selected "${suggestion.name}"`);
    setErrorMessage(null);
  };

  // Opt-in: Get current device location (resolves to placeName and Place ID, not raw coordinates)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);
    setStatusMessage('Requesting device location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          setStatusMessage('Resolving nearby place name via Google Places...');
          const res = await fetch(`/api/maps/geocode?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            setPlaceName(data.placeName || 'Current Location');
            setPlaceId(data.placeId);
            setAddress(data.address || '');
            setStatusMessage('Place name and Place ID resolved successfully.');
          } else {
            setPlaceName('Nearby Area');
            setPlaceId(`loc_${Date.now()}`);
            setStatusMessage('Location attached.');
          }
        } catch {
          setPlaceName('Nearby Area');
          setPlaceId(`loc_${Date.now()}`);
          setStatusMessage('Location attached.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setStatusMessage(null);
        if (err.code === 1) {
          setErrorMessage('Location permission was denied. You can search for a place by name below.');
        } else {
          setErrorMessage('Could not determine current location. Try typing in the search bar instead.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // Save selected place: stores placeName and Place ID (never raw coordinates)
  const handleSave = () => {
    if (!placeName.trim()) {
      setErrorMessage('Please search and select a place before attaching.');
      return;
    }

    const finalLocation: EntryLocation = {
      placeName: placeName.trim(),
      placeId: placeId || undefined,
      address: address.trim() || undefined
    };

    onSaveLocation(finalLocation);
    onClose();
  };

  const handleRemove = () => {
    onSaveLocation(undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C2C24]/60 dark:bg-black/70 backdrop-blur-xs">
      <div
        id="location-picker-modal"
        className="w-full max-w-lg bg-[#FDFCF9] rounded-2xl border border-[#D9D7CE] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#D9D7CE] flex items-center justify-between bg-[#F5F5F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5A5A40] flex items-center justify-center text-[#FDFCF9] shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-[#2C2C24]">Attach Location</h3>
              <p className="text-[11px] text-[#706E64]">Google Places search • Opt-in per entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#EDEBE4] text-[#706E64] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Privacy Notice Banner: Emphasizing Data Minimization */}
          <div className="p-3 rounded-xl bg-[#EDEBE4] border border-[#D9D7CE] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#555550] leading-relaxed">
              <strong>Private & Explicitly Opt-in:</strong> We practice data minimization. Only the <em>place name</em> and Google <em>Place ID</em> are stored—never raw GPS coordinates. Your reflection location remains private under your owner-bound account.
            </div>
          </div>

          {/* Quick Actions & Autocomplete Search */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                id="location-modal-current-device-btn"
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="w-full py-2 px-3 rounded-xl bg-[#EDEBE4] hover:bg-[#E4E2D8] border border-[#D9D7CE] text-[#2C2C24] font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xs"
              >
                <Navigation className={`w-3.5 h-3.5 text-[#5A5A40] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Resolving Place...' : 'Use Current Device Location'}</span>
              </button>
            </div>

            {/* Google Places Autocomplete Search Bar */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-semibold text-[#4A4A30] mb-1">
                Search Place (Google Places Autocomplete)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8A887D]" />
                <input
                  id="location-modal-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Type a place name (e.g. Marina Beach, Chennai)..."
                  autoComplete="off"
                  className="w-full pl-8 pr-8 py-2 rounded-xl border border-[#D9D7CE] bg-[#FDFCF9] focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40] text-xs text-[#2C2C24]"
                />
                {isLoadingSuggestions && (
                  <Loader2 className="w-3.5 h-3.5 absolute right-3 top-3 text-[#8A887D] animate-spin" />
                )}
              </div>

              {/* Live Place Suggestions Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div
                  id="location-autocomplete-dropdown"
                  className="absolute left-0 right-0 top-full mt-1 bg-[#FDFCF9] border border-[#D9D7CE] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#EDEBE4]"
                >
                  <div className="px-3 py-1.5 bg-[#F5F5F0] text-[10px] font-medium text-[#706E64] flex items-center justify-between">
                    <span>Google Places Suggestions</span>
                    <span>Click to select</span>
                  </div>
                  {suggestions.map((sug) => (
                    <button
                      key={sug.placeId}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#EDEBE4] transition-colors flex items-start gap-2.5 group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-[#2C2C24] leading-tight">
                          {sug.mainText}
                        </div>
                        {sug.secondaryText && (
                          <div className="text-[11px] text-[#706E64] truncate mt-0.5">
                            {sug.secondaryText}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status & Error Messages */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="text-[11px] text-[#5A5A40] font-medium flex items-center gap-1.5">
              <Check className="w-3 h-3 text-[#5A5A40]" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Selected Location Details & Preview */}
          {placeName && (
            <div className="space-y-3 pt-2 border-t border-[#D9D7CE]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-[#4A4A30]">
                    Selected Place Name (Display Value)
                  </label>
                  {placeId && (
                    <span className="text-[10px] text-[#706E64] font-mono">
                      Place ID recorded
                    </span>
                  )}
                </div>
                <input
                  id="location-modal-label-input"
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="e.g. Marina Beach, Chennai"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D9D7CE] bg-[#FDFCF9] focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40] text-xs text-[#2C2C24] font-medium"
                />
              </div>

              {address && (
                <p className="text-[11px] text-[#706E64] line-clamp-2">
                  <span className="font-semibold text-[#4A4A30]">Vicinity: </span>
                  {address}
                </p>
              )}

              {/* Map / Place Preview */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-[#4A4A30]">Preview</label>
                <MapPinView
                  location={{
                    placeName,
                    placeId,
                    address: address || undefined
                  }}
                  height="160px"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-[#D9D7CE] bg-[#F5F5F0] flex items-center justify-between">
          <div>
            {currentLocation && (
              <button
                id="location-modal-remove-btn"
                type="button"
                onClick={handleRemove}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Location</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-[#D9D7CE] text-[#555550] hover:bg-[#EDEBE4] font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="location-modal-save-btn"
              type="button"
              onClick={handleSave}
              disabled={!placeName.trim()}
              className="px-4 py-1.5 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A30] text-[#FDFCF9] font-medium text-xs transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Attach Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
