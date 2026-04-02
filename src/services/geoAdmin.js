import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'

export const SEARCH_BASE_URL =
  'https://api3.geo.admin.ch/rest/services/ech/SearchServer'

export const SWISSTOPO_WMTS_CAPABILITIES_URL =
  'https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml'

export const SWISSTOPO_TERRAIN_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/'

export const SWISSTOPO_BUILDINGS_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/tileset.json'

export const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

export const VALAIS_DANAT_MAPSERVER_URL =
  'https://sit.vs.ch/arcgis/rest/services/DANAT/MapServer'

export const VALAIS_AVALANCHE_LAYER_ID = 1001
export const VALAIS_AVALANCHE_PAGE_SIZE = 2000

async function verifierReponse(reponse, messageErreur) {
  if (reponse.ok) return reponse
  throw new Error(messageErreur)
}

async function fetchJson(url, messageErreur) {
  const response = await fetch(url)
  await verifierReponse(response, messageErreur)
  return response.json()
}

function buildAvalancheQueryUrl(
  offset = 0,
  recordCount = VALAIS_AVALANCHE_PAGE_SIZE
) {
  const url = new URL(
    `${VALAIS_DANAT_MAPSERVER_URL}/${VALAIS_AVALANCHE_LAYER_ID}/query`
  )

  url.searchParams.set('where', '1=1')
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('outFields', '*')
  url.searchParams.set('outSR', '4326')
  url.searchParams.set('f', 'geojson')
  url.searchParams.set('resultOffset', String(offset))
  url.searchParams.set('resultRecordCount', String(recordCount))
  url.searchParams.set('orderByFields', 'OBJECTID ASC')

  return url.toString()
}

export async function fetchAllValaisAvalancheGeoJson() {
  const allFeatures = []
  let offset = 0

  while (true) {
    const url = buildAvalancheQueryUrl(offset, VALAIS_AVALANCHE_PAGE_SIZE)
    const json = await fetchJson(
      url,
      'Erreur lors du chargement paginé des avalanches du Valais'
    )
    const features = json?.features || []
    allFeatures.push(...features)

    if (features.length < VALAIS_AVALANCHE_PAGE_SIZE) {
      break
    }

    offset += VALAIS_AVALANCHE_PAGE_SIZE
  }

  return {
    type: 'FeatureCollection',
    features: allFeatures
  }
}

export async function getSwisstopoWmtsCapabilities() {
  const parser = new WMTSCapabilities()
  const response = await fetch(SWISSTOPO_WMTS_CAPABILITIES_URL)
  await verifierReponse(
    response,
    'Erreur lors du chargement des capabilities WMTS swisstopo'
  )

  const text = await response.text()
  return parser.read(text)
}

export async function searchLocations(searchText) {
  const url = new URL(SEARCH_BASE_URL)
  const params = {
    type: 'locations',
    searchText,
    returnGeometry: 'true',
    sr: '2056',
    limit: '10'
  }

  for (const [cle, valeur] of Object.entries(params)) {
    url.searchParams.set(cle, valeur)
  }

  return fetchJson(url, 'Erreur lors de la recherche geo.admin')
}