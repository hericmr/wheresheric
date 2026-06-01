export async function geocodeAddress(address) {
  const params = new URLSearchParams({
    q: `${address}, Santos, SP, Brasil`,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'WhereSheric/1.0' } }
  );

  if (!res.ok) throw new Error('Nominatim ' + res.status);

  const data = await res.json();
  if (!data.length) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
