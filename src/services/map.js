import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Overlay from 'ol/Overlay.js'
import { Style, Fill, Stroke } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js'

import {
  getSwisstopoWmtsCapabilities,
  fetchAllValaisAvalancheGeoJson,
  fetchAllValaisGlissementGeoJson,
  fetchAllValaisHydrologieGeoJson
} from '../services/geoAdmin.js'

const DANGER_STYLES = {
  avalanche: {
    dangerKey: 'DEGRE_DANGER',
    strokeWidth: 1,
    default: {
      fill: 'rgba(160, 160, 160, 0.35)',
      stroke: 'rgba(104, 104, 104, 1)',
      lineDash: undefined
    },
    values: {
      0: {
        fill: 'rgba(255, 255, 255, 0.20)',
        stroke: 'rgba(104, 104, 104, 0.6)',
        lineDash: undefined
      },
      1: {
        fill: 'rgba(255, 248, 103, 0.35)',
        stroke: 'rgba(255, 248, 103, 1)',
        lineDash: [6, 6]
      },
      2: {
        fill: 'rgba(255, 248, 103, 0.70)',
        stroke: 'rgba(104, 104, 104, 1)',
        lineDash: undefined
      },
      3: {
        fill: 'rgba(85, 142, 213, 0.70)',
        stroke: 'rgba(104, 104, 104, 1)',
        lineDash: undefined
      },
      4: {
        fill: 'rgba(255, 93, 81, 0.70)',
        stroke: 'rgba(104, 104, 104, 1)',
        lineDash: undefined
      },
      5: {
        fill: 'rgba(255, 170, 0, 0.70)',
        stroke: 'rgba(104, 104, 104, 1)',
        lineDash: undefined
      }
    }
  },

  glissement: {
    dangerKey: 'DANGER',
    strokeWidth: 1.5,
    default: {
      fill: 'rgba(160, 160, 160, 0.35)',
      stroke: 'rgba(104, 104, 104, 1)',
      lineDash: undefined
    },
    values: {
      0: {
        fill: 'rgba(189, 195, 199, 0.20)',
        stroke: 'rgba(127, 140, 141, 0.6)',
        lineDash: undefined
      },
      1: {
        fill: 'rgba(241, 196, 15, 0.35)',
        stroke: 'rgba(241, 196, 15, 1)',
        lineDash: [6, 6]
      },
      2: {
        fill: 'rgba(241, 196, 15, 0.70)',
        stroke: 'rgba(183, 149, 11, 1)',
        lineDash: undefined
      },
      3: {
        fill: 'rgba(230, 126, 34, 0.70)',
        stroke: 'rgba(152, 76, 0, 1)',
        lineDash: undefined
      },
      4: {
        fill: 'rgba(204, 85, 0, 0.70)',
        stroke: 'rgba(102, 43, 0, 1)',
        lineDash: undefined
      }
    }
  },

  hydrologie: {
    dangerKey: 'DEGRE_DANGER_CODE',
    strokeWidth: 2,
    default: {
      fill: 'rgba(173, 216, 230, 0.70)',
      stroke: 'rgba(51, 102, 204, 1)',
      lineDash: undefined
    },
    values: {
      1: {
        fill: 'rgba(102, 153, 255, 0.35)',
        stroke: 'rgba(102, 153, 255, 1)',
        lineDash: [6, 6]
      },
      2: {
        fill: 'rgba(102, 153, 255, 0.70)',
        stroke: 'rgba(51, 102, 204, 1)',
        lineDash: undefined
      },
      3: {
        fill: 'rgba(255, 102, 0, 0.70)',
        stroke: 'rgba(204, 51, 0, 1)',
        lineDash: undefined
      },
      4: {
        fill: 'rgba(204, 0, 0, 0.70)',
        stroke: 'rgba(102, 0, 0, 1)',
        lineDash: undefined
      },
      41: {
        fill: 'rgba(153, 0, 0, 0.70)',
        stroke: 'rgba(102, 0, 0, 1)',
        lineDash: undefined
      },
      42: {
        fill: 'rgba(128, 0, 128, 0.70)',
        stroke: 'rgba(80, 0, 80, 1)',
        lineDash: undefined
      }
    }
  }
}

function createPolygonStyle(styleInfo, strokeWidth) {
  return new Style({
    stroke: new Stroke({
      color: styleInfo.stroke,
      width: strokeWidth,
      lineDash: styleInfo.lineDash
    }),
    fill: new Fill({
      color: styleInfo.fill
    })
  })
}

function createLayerStyle(layerType) {
  const config = DANGER_STYLES[layerType]

  return (feature) => {
    const dangerValue = Number(feature.getProperties()[config.dangerKey] ?? 0)
    const styleInfo = config.values[dangerValue] || config.default

    return createPolygonStyle(styleInfo, config.strokeWidth)
  }
}

const DANGER_LAYER_FETCHERS = {
  avalanche: fetchAllValaisAvalancheGeoJson,
  glissement: fetchAllValaisGlissementGeoJson,
  hydrologie: fetchAllValaisHydrologieGeoJson
}

const dangerLayerPromises = {}

async function createDangerLayer(fetcher, layerType) {
  const geojson = await fetcher()

  const source = new VectorSource({
    features: new GeoJSON().readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
  })

  const layer = new VectorLayer({
    source,
    style: createLayerStyle(layerType)
  })

  layer.set('layerType', layerType)
  layer.setZIndex(20)

  return layer
}

export function loadDangerLayer(layerId) {
  if (!DANGER_LAYER_FETCHERS[layerId]) {
    throw new Error(`Unknown danger layer "${layerId}"`)
  }

  if (!dangerLayerPromises[layerId]) {
    dangerLayerPromises[layerId] = createDangerLayer(
      DANGER_LAYER_FETCHERS[layerId],
      layerId
    )
  }

  return dangerLayerPromises[layerId]
}

export function preloadDangerLayers(activeLayerId) {
  const otherLayerIds = Object.keys(DANGER_LAYER_FETCHERS).filter(
    (layerId) => layerId !== activeLayerId
  )

  return Promise.all(otherLayerIds.map((layerId) => loadDangerLayer(layerId)))
}

export async function buildMap(target, popupElement, initialLayerId = 'avalanche') {
  const [capabilities, initialDangerLayer] = await Promise.all([
    getSwisstopoWmtsCapabilities(),
    loadDangerLayer(initialLayerId)
  ])

  const popupOverlay = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    offset: [0, -12],
    stopEvent: false
  })

  const swisstopoLayer = new TileLayer({
    source: new WMTS(
      optionsFromCapabilities(capabilities, {
        layer: 'ch.swisstopo.pixelkarte-farbe',
        matrixSet: 'EPSG:3857'
      })
    )
  })

  const map = new Map({
    target,
    layers: [swisstopoLayer, initialDangerLayer],
    overlays: [popupOverlay],
    view: new View({
      center: fromLonLat([7.45, 46.15]),
      zoom: 10
    })
  })

  return {
    map,
    popupOverlay,
    initialDangerLayer
  }
}