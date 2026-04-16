import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'

// Swisstopo URLs
export const SWISSTOPO_WMTS_CAPABILITIES_URL =
  'https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml'
export const SWISSTOPO_SWISSIMAGE_WMTS_URL =
  'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{TileMatrix}/{TileCol}/{TileRow}.jpeg'
export const SWISSTOPO_TERRAIN_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/'
export const SWISSTOPO_BUILDINGS_URL =
  'https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/tileset.json'

// Cesium configuration
export const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

// Valais hazard data configuration
export const VALAIS_DANAT_MAPSERVER_URL =
  'https://sit.vs.ch/arcgis/rest/services/DANAT/MapServer'
export const VALAIS_AVALANCHE_LAYER_ID = 1001
export const VALAIS_GLISSEMENT_PERMANENT_LAYER_ID = 1204
export const VALAIS_GLISSEMENT_SPONTANE_LAYER_ID = 1207
export const VALAIS_HYDROLOGIE_LAYER_ID = 1102
export const VALAIS_QUERY_PAGE_SIZE = 2000

function createMapServerQueryUrl(layerId, offset = 0, recordCount = VALAIS_QUERY_PAGE_SIZE) {
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

async function fetchPaginatedLayerGeoJson(layerId, errorMessage) {
  const allFeatures = []
  let offset = 0

  while (true) {
    const response = await fetch(
      createMapServerQueryUrl(layerId, offset, VALAIS_QUERY_PAGE_SIZE)
    )

    if (!response.ok) {
      throw new Error(errorMessage)
    }

    const { features = [] } = await response.json()

    allFeatures.push(...features)

    if (features.length < VALAIS_QUERY_PAGE_SIZE) break

    offset += VALAIS_QUERY_PAGE_SIZE
  }

  return { type: 'FeatureCollection', features: allFeatures }
}

export function fetchValaisAvalancheGeoJson() {
  return fetchPaginatedLayerGeoJson(
    VALAIS_AVALANCHE_LAYER_ID,
    'Error loading paginated avalanche hazard zones from Valais'
  )
}

export async function fetchValaisGlissementGeoJson() {
  const [permanent, spontaneous] = await Promise.all([
    fetchPaginatedLayerGeoJson(
      VALAIS_GLISSEMENT_PERMANENT_LAYER_ID,
      'Error loading paginated permanent landslide zones from Valais'
    ),
    fetchPaginatedLayerGeoJson(
      VALAIS_GLISSEMENT_SPONTANE_LAYER_ID,
      'Error loading paginated spontaneous landslide zones from Valais'
    )
  ])

  return {
    type: 'FeatureCollection',
    features: [...(permanent.features || []), ...(spontaneous.features || [])]
  }
}

export function fetchValaisHydrologieGeoJson() {
  return fetchPaginatedLayerGeoJson(
    VALAIS_HYDROLOGIE_LAYER_ID,
    'Error loading paginated hydrological hazard zones from Valais'
  )
}

export async function fetchSwisstopoWmtsCapabilities() {
  const parser = new WMTSCapabilities()
  const response = await fetch(SWISSTOPO_WMTS_CAPABILITIES_URL)

  if (!response.ok) {
    throw new Error('Error loading Swisstopo WMTS capabilities')
  }

  return parser.read(await response.text())
}