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
  fetchSwisstopoWmtsCapabilities,
  fetchValaisAvalancheGeoJson,
  fetchValaisGlissementGeoJson,
  fetchValaisHydrologieGeoJson
} from './geoAdmin.js'

// Hazard styling configuration by danger type and level
const HAZARD_LAYER_STYLES = {
  avalanche: {
    dangerPropertyKey: 'DEGRE_DANGER',
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
    dangerPropertyKey: 'DANGER',
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
    dangerPropertyKey: 'DEGRE_DANGER_CODE',
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

const HAZARD_LAYER_FETCHERS = {
  avalanche: fetchValaisAvalancheGeoJson,
  glissement: fetchValaisGlissementGeoJson,
  hydrologie: fetchValaisHydrologieGeoJson
}

const hazardLayerCache = {}

function buildPolygonStyle(styleConfig, strokeWidth) {
  return new Style({
    stroke: new Stroke({
      color: styleConfig.stroke,
      width: strokeWidth,
      lineDash: styleConfig.lineDash
    }),
    fill: new Fill({
      color: styleConfig.fill
    })
  })
}

function createLayerStyleFunction(hazardType) {
  const config = HAZARD_LAYER_STYLES[hazardType]

  return (feature) => {
    const dangerValue = Number(feature.getProperties()[config.dangerPropertyKey] ?? 0)
    const styleConfig = config.values[dangerValue] || config.default
    return buildPolygonStyle(styleConfig, config.strokeWidth)
  }
}

async function createHazardLayer(fetcher, hazardType) {
  const geoJson = await fetcher()

  const source = new VectorSource({
    features: new GeoJSON().readFeatures(geoJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
  })

  const layer = new VectorLayer({
    source,
    style: createLayerStyleFunction(hazardType)
  })

  layer.set('hazardType', hazardType)
  layer.setZIndex(20)

  return layer
}

export function loadHazardLayer(hazardType) {
  if (!HAZARD_LAYER_FETCHERS[hazardType]) {
    throw new Error(`Unknown hazard layer: "${hazardType}"`)
  }

  if (!hazardLayerCache[hazardType]) {
    hazardLayerCache[hazardType] = createHazardLayer(
      HAZARD_LAYER_FETCHERS[hazardType],
      hazardType
    )
  }

  return hazardLayerCache[hazardType]
}

export function preloadHazardLayers(activeHazardType) {
  const otherHazardTypes = Object.keys(HAZARD_LAYER_FETCHERS).filter(
    (type) => type !== activeHazardType
  )

  return Promise.all(otherHazardTypes.map((type) => loadHazardLayer(type)))
}

export async function initializeMap(mapElement, popupElement, initialHazardType = 'avalanche') {
  const [capabilities, initialHazardLayer] = await Promise.all([
    fetchSwisstopoWmtsCapabilities(),
    loadHazardLayer(initialHazardType)
  ])

  const popupOverlay = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    offset: [0, -12],
    stopEvent: false
  })

  const swisstopoBaseLayer = new TileLayer({
    source: new WMTS(
      optionsFromCapabilities(capabilities, {
        layer: 'ch.swisstopo.pixelkarte-farbe',
        matrixSet: 'EPSG:3857'
      })
    )
  })

  const map = new Map({
    target: mapElement,
    layers: [swisstopoBaseLayer, initialHazardLayer],
    overlays: [popupOverlay],
    view: new View({
      center: fromLonLat([7.45, 46.15]),
      zoom: 10
    })
  })

  return {
    map,
    popupOverlay,
    initialHazardLayer
  }
}