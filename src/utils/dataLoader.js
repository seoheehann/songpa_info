const baseUrl = import.meta.env.BASE_URL || './';

function assetPath(path) {
  return `${baseUrl}${path.replace(/^\//, '')}`;
}

export async function fetchGeoJSON(path) {
  const url = assetPath(path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} 로드 실패: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function loadParcels() {
  return fetchGeoJSON('data/parcels.geojson');
}

export async function loadBoundaries() {
  return fetchGeoJSON('data/boundaries.geojson');
}
