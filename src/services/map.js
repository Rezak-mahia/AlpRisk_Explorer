import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import Overlay from 'ol/Overlay.js'
import { Style, Circle, Fill, Stroke, Text } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'

import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js'
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'

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

export async function buildMap(target, summitFeatures, popupElement) {
  const summitSource = new VectorSource({
    features: summitFeatures
  })

  const summitLayer = new VectorLayer({
    source: summitSource
  })

  summitLayer.setZIndex(100)

  const popupOverlay = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    offset: [0, -12],
    stopEvent: false
  })

  const parser = new WMTSCapabilities()

  const response = await fetch(
    'https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml'
  )
  const text = await response.text()
  const result = parser.read(text)

  const swisstopoLayer = new TileLayer({
    source: new WMTS(
      optionsFromCapabilities(result, {
        layer: 'ch.swisstopo.pixelkarte-farbe',
        matrixSet: 'EPSG:3857'
      })
    )
  })

  const map = new Map({
    target,
    layers: [swisstopoLayer, summitLayer],
    overlays: [popupOverlay],
    view: new View({
      center: fromLonLat([8.23, 46.82]),
      zoom: 8
    })
  })

  return { map, popupOverlay }
}