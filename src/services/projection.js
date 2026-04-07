const SWISSTOPO_REFRAME_BASE_URL = 'https://geodesy.geo.admin.ch/reframe'

async function fetchJson(url, errorMessage) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(errorMessage)
  }

  return response.json()
}

export async function lv95ToLonLat(x, y) {
  const url =
    `${SWISSTOPO_REFRAME_BASE_URL}/lv95towgs84` +
    `?easting=${encodeURIComponent(x)}` +
    `&northing=${encodeURIComponent(y)}` +
    `&format=json`

  const data = await fetchJson(
    url,
    'Erreur lors de la conversion LV95 vers WGS84'
  )

  return {
    lon: Number(data.easting),
    lat: Number(data.northing)
  }
}

export async function lonLatToLV95(lon, lat) {
  const url =
    `${SWISSTOPO_REFRAME_BASE_URL}/wgs84tolv95` +
    `?easting=${encodeURIComponent(lon)}` +
    `&northing=${encodeURIComponent(lat)}` +
    `&format=json`

  const data = await fetchJson(
    url,
    'Erreur lors de la conversion WGS84 vers LV95'
  )

  return {
    x: Number(data.easting),
    y: Number(data.northing)
  }
}

export async function webMercatorToLV95(x, y) {
  const lon = (x * 180) / 20037508.34
  const lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((y / 20037508.34) * Math.PI)) - Math.PI / 2)

  return lonLatToLV95(lon, lat)
}