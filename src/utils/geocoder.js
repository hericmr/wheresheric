const HEADERS = { 'Accept-Language': 'pt-BR', 'User-Agent': 'WhereSheric/1.0' };

export async function geocodeAddress(address) {
  const params = new URLSearchParams({
    q: `${address}, Santos, SP, Brasil`,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error('Nominatim ' + res.status);
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({ lat, lon: lng, format: 'json' });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.error) return null;
  const addr = data.address || {};
  const parts = [addr.road, addr.suburb || addr.neighbourhood || addr.city_district].filter(Boolean);
  return { displayName: parts.join(', ') || data.display_name };
}
