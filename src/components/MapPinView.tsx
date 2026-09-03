import React, { useEffect, useState } from 'react';
import { EntryLocation } from '../types';
import { getGoogleMapsApiKey } from '../lib/mapsConfig';
import { MapPin, ExternalLink, Compass } from 'lucide-react';

interface MapPinViewProps {
  location: EntryLocation;
  zoom?: number;
  height?: string;
  className?: string;
  interactive?: boolean;
}

export const MapPinView: React.FC<MapPinViewProps> = ({
  location,
  height = '180px',
  className = ''
}) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getGoogleMapsApiKey().then((key) => {
      if (isMounted) {
        setApiKey(key);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Construct Google Maps search URL with Place ID when available for unambiguous resolution
  const googleMapsUrl = location.placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.placeName
      )}&query_place_id=${encodeURIComponent(location.placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.placeName)}`;

  if (loading) {
    return (
      <div
        style={{ height }}
        className={`w-full rounded-xl bg-[#EDEBE4] border border-[#D9D7CE] flex items-center justify-center text-xs text-[#706E64] ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
          <span>Loading location preview...</span>
        </div>
      </div>
    );
  }

  // If a valid Google Maps API key is configured and place ID / name is present
  if (apiKey) {
    const embedQuery = location.placeId
      ? `place_id:${location.placeId}`
      : encodeURIComponent(location.placeName);

    return (
      <div
        style={{ height }}
        className={`w-full rounded-xl overflow-hidden border border-[#D9D7CE] relative ${className}`}
      >
        <iframe
          title={`Map for ${location.placeName}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${embedQuery}`}
        />

        <div className="absolute bottom-1.5 right-1.5 bg-[#FDFCF9]/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] text-[#5A5A40] border border-[#D9D7CE] flex items-center gap-1.5 shadow-xs">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium hover:underline"
          >
            <span>Open in Maps</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    );
  }

  // Place card display when API key is not configured or in lightweight preview mode
  return (
    <div
      style={{ height }}
      className={`w-full rounded-xl bg-[#EDEBE4]/60 border border-[#D9D7CE] p-3.5 flex flex-col justify-between relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5A5A40] flex items-center justify-center text-[#FDFCF9] shadow-xs shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h5 className="font-serif font-semibold text-xs text-[#2C2C24] leading-tight truncate">
              {location.placeName}
            </h5>
            {location.address && (
              <p className="text-[11px] text-[#706E64] line-clamp-1 mt-0.5">{location.address}</p>
            )}
          </div>
        </div>

        {location.placeId && (
          <span className="text-[10px] font-medium text-[#5A5A40] bg-[#FDFCF9] px-2 py-0.5 rounded-full border border-[#D9D7CE] shrink-0">
            Place Verified
          </span>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-[#D9D7CE]/60 flex items-center justify-between text-[11px]">
        <span className="text-[#706E64] text-[10px] flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#5A5A40]" />
          <span>Location attached (Opt-in)</span>
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#5A5A40] font-medium hover:underline text-xs"
        >
          <span>View on Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

