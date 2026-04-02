import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Overlay from 'ol/Overlay.js'
import { Style, Circle, Fill, Stroke } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js'

import {
  getSwisstopoWmtsCapabilities,
  fetchAllValaisAvalancheGeoJson
} from '../services/geoAdmin.js'

const COULEUR_CONTOUR = 'rgba(104, 104, 104, 1)'
const STYLE_AVALANCHE_PAR_DEFAUT = {
  fill: 'rgba(160, 160, 160, 0.35)',
  stroke: COULEUR_CONTOUR,
  lineDash: undefined
}

const STYLES_AVALANCHE = {
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
    stroke: COULEUR_CONTOUR,
    lineDash: undefined
  },
  3: {
    fill: 'rgba(85, 142, 213, 0.70)',
    stroke: COULEUR_CONTOUR,
    lineDash: undefined
  },
  4: {
    fill: 'rgba(255, 93, 81, 0.70)',
    stroke: COULEUR_CONTOUR,
    lineDash: undefined
  },
  5: {
    fill: 'rgba(255, 170, 0, 0.70)',
    stroke: COULEUR_CONTOUR,
    lineDash: undefined
  }
}

function getAvalancheStyleInfo(feature) {
  const props = feature.getProperties()
  const danger = Number(props.DEGRE_DANGER ?? 0)

  return STYLES_AVALANCHE[danger] || STYLE_AVALANCHE_PAR_DEFAUT
}

function createAvalancheStyle(feature) {
  const info = getAvalancheStyleInfo(feature)

  return new Style({
    stroke: new Stroke({
      color: info.stroke,
      width: 1,
      lineDash: info.lineDash
    }),
    fill: new Fill({
      color: info.fill
    })
  })
}

async function createAvalancheLayer() {
  const geojson = await fetchAllValaisAvalancheGeoJson()

  const source = new VectorSource({
    features: new GeoJSON().readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })
  })

  const layer = new VectorLayer({
    source,
    style: createAvalancheStyle
  })

  layer.set('layerType', 'avalanche')
  layer.setZIndex(20)

  return layer
}

export async function buildMap(target, popupElement) {
  const avalancheLayer = await createAvalancheLayer()

  const popupOverlay = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    offset: [0, -12],
    stopEvent: false
  })

  const capabilities = await getSwisstopoWmtsCapabilities()

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
    layers: [swisstopoLayer, avalancheLayer],
    overlays: [popupOverlay],
    view: new View({
      center: fromLonLat([7.45, 46.15]),
      zoom: 10
    })
  })

  return {
    map,
    popupOverlay,
    avalancheLayer
  }
}