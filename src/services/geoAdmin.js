import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'

// =========================
// SERVICES SWISSTOPO
// =========================

export const SWISSTOPO_WMTS_CAPABILITIES_URL =
  'https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml'

export const SWISSTOPO_SWISSIMAGE_WMTS_URL =
  'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{TileMatrix}/{TileCol}/{TileRow}.jpeg'

export const SWISSTOPO_TERRAIN_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/'

export const SWISSTOPO_BUILDINGS_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/tileset.json'

// =========================
// CESIUM
// =========================

export const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

// =========================
// DONNÉES DANGERS VALAIS
// =========================

export const VALAIS_DANAT_MAPSERVER_URL =
  'https://sit.vs.ch/arcgis/rest/services/DANAT/MapServer'

export const VALAIS_AVALANCHE_LAYER_ID = 1001
export const VALAIS_GLISSEMENT_LAYER_ID = 1207
export const VALAIS_HYDROLOGIE_LAYER_ID = 1102
export const VALAIS_QUERY_PAGE_SIZE = 2000

function buildQueryUrl(layerId, offset = 0, recordCount = VALAIS_QUERY_PAGE_SIZE) {
  const url = new URL(`${VALAIS_DANAT_MAPSERVER_URL}/${layerId}/query`)

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

async function fetchAllValaisLayerGeoJson(layerId, errorMessage) {
  const allFeatures = []
  let offset = 0

  while (true) {
    const response = await fetch(
      buildQueryUrl(layerId, offset, VALAIS_QUERY_PAGE_SIZE)
    )

    if (!response.ok) {
      throw new Error(errorMessage)
    }

    const json = await response.json()
    const features = json?.features || []

    allFeatures.push(...features)

    if (features.length < VALAIS_QUERY_PAGE_SIZE) {
      break
    }

    offset += VALAIS_QUERY_PAGE_SIZE
  }

  return {
    type: 'FeatureCollection',
    features: allFeatures
  }
}

export function fetchAllValaisAvalancheGeoJson() {
  return fetchAllValaisLayerGeoJson(
    VALAIS_AVALANCHE_LAYER_ID,
    "Erreur lors du chargement paginé des avalanches du Valais"
  )
}

export function fetchAllValaisGlissementGeoJson() {
  return fetchAllValaisLayerGeoJson(
    VALAIS_GLISSEMENT_LAYER_ID,
    "Erreur lors du chargement paginé des glissements du Valais"
  )
}

export function fetchAllValaisHydrologieGeoJson() {
  return fetchAllValaisLayerGeoJson(
    VALAIS_HYDROLOGIE_LAYER_ID,
    "Erreur lors du chargement paginé des données d'hydrologie du Valais"
  )
}

// =========================
// WMTS SWISSTOPO
// =========================

export async function getSwisstopoWmtsCapabilities() {
  const parser = new WMTSCapabilities()
  const response = await fetch(SWISSTOPO_WMTS_CAPABILITIES_URL)

  if (!response.ok) {
    throw new Error('Erreur lors du chargement des capabilities WMTS swisstopo')
  }

  return parser.read(await response.text())
}