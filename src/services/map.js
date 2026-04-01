import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import Overlay from 'ol/Overlay.js'
import { Style, Circle, Fill, Stroke, Text } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js'

import {
  getSwisstopoWmtsCapabilities,
  getValaisAvalancheGeoJsonUrl
} from '../services/geoAdmin.js'

export function createSummitFeature(summit) {
  const coordinates = fromLonLat([summit.lon, summit.lat])

  const feature = new Feature({
    geometry: new Point(coordinates),
    summit
  })

  feature.setStyle(
    new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: '#dc2626' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      }),
      text: new Text({
        text: summit.label,
        offsetY: -18,
        fill: new Fill({ color: '#111827' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 })
      })
    })
  )

  return feature
}

function getAvalancheColors(feature) {
  const props = feature.getProperties()
  const danger = Number(
    props.DEGRE_DANGER ??
      props.degre_danger ??
      props.DANGER ??
      props.NIVEAU_DANGER ??
      props.CLASSE ??
      0
  )

  if (danger === 4) {
    return {
      fill: 'rgba(255, 93, 81, 0.70)',
      stroke: 'rgba(104, 104, 104, 1)'
    }
  }

  if (danger === 3) {
    return {
      fill: 'rgba(85, 142, 213, 0.70)',
      stroke: 'rgba(104, 104, 104, 1)'
    }
  }

  if (danger === 2) {
    return {
      fill: 'rgba(255, 235, 59, 0.70)',
      stroke: 'rgba(104, 104, 104, 1)'
    }
  }

  return {
    fill: 'rgba(160, 160, 160, 0.35)',
    stroke: 'rgba(104, 104, 104, 1)'
  }
}

function createAvalancheStyle(feature) {
  const colors = getAvalancheColors(feature)

  return new Style({
    stroke: new Stroke({
      color: colors.stroke,
      width: 1
    }),
    fill: new Fill({
      color: colors.fill
    })
  })
}

function createAvalancheLayer() {
  const layer = new VectorLayer({
    source: new VectorSource({
      url: getValaisAvalancheGeoJsonUrl(),
      format: new GeoJSON()
    }),
    style: createAvalancheStyle
  })

  layer.set('layerType', 'avalanche')
  layer.setZIndex(20)

  return layer
}

export async function buildMap(target, summitFeatures, popupElement) {
  const summitSource = new VectorSource({
    features: summitFeatures
  })

  const summitLayer = new VectorLayer({
    source: summitSource
  })
  summitLayer.setZIndex(100)

  const avalancheLayer = createAvalancheLayer()

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
    layers: [swisstopoLayer, avalancheLayer, summitLayer],
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