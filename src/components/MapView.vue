<template>
  <div class="map-container">
    <div class="map-toolbar">
      <button @click="centrerValais">Centrer sur le Valais</button>
      <button @click="activerDessin">Dessiner un profil</button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div ref="popupEl" class="map-popup" v-show="popupVisible">
      <template v-if="popupMode === 'summit'">
        <strong>{{ popupData?.label }}</strong>
        <div>{{ popupData?.altitude ?? '—' }} m</div>
        <div>{{ popupData?.canton }}</div>
      </template>

      <template v-else-if="popupMode === 'avalanche'">
        <strong>Zone d’avalanche</strong>
        <div v-if="popupData?.dangerLabel">Danger : {{ popupData.dangerLabel }}</div>
        <div v-if="popupData?.commune">Commune : {{ popupData.commune }}</div>
        <div v-if="popupData?.id">Identifiant : {{ popupData.id }}</div>
      </template>

      <template v-else-if="popupMode === 'point'">
        <strong>Point sélectionné</strong>
        <div>E : {{ Math.round(popupData?.x || 0) }}</div>
        <div>N : {{ Math.round(popupData?.y || 0) }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import { getCenter } from 'ol/extent'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import Draw from 'ol/interaction/Draw.js'
import { Style, Stroke, Circle, Fill } from 'ol/style.js'
import { createSummitFeature, buildMap } from '../services/map.js'
import {
  webMercatorToLV95,
  lv95ToWebMercator
} from '../services/projection.js'

const props = defineProps({
  summits: {
    type: Array,
    required: true
  },
  selectedSummit: {
    type: Object,
    default: null
  },
  selectedDangerLayer: {
    type: String,
    default: null
  },
  clickedPoint: {
    type: Object,
    default: null
  },
  drawnLine: {
    type: Array,
    default: null
  }
})

const emit = defineEmits([
  'select-summit',
  'map-click',
  'draw-line',
  'select-avalanche',
  'center-valais'
])

const mapEl = ref(null)
const popupEl = ref(null)
const popupVisible = ref(false)
const popupData = ref(null)
const popupMode = ref(null)

let mapInstance = null
let popupOverlay = null
let mapReady = false
let avalancheLayer = null

let profileSource = null
let profileLayer = null

let drawSource = null
let drawLayer = null
let drawInteraction = null

let clickedPointSource = null
let clickedPointLayer = null

function summitToMapCoords(summit) {
  return fromLonLat([summit.lon, summit.lat])
}

function dangerLabelFromValue(value) {
  const n = Number(value)
  if (n === 4) return 'élevé'
  if (n === 3) return 'moyen'
  if (n === 2) return 'faible'
  if (n === 1) return 'résiduel'
  if (n === 5) return 'indicatif'
  if (n === 0) return 'non exposé'
  return `${value ?? ''}`
}

function extractAvalancheData(feature) {
  const props = feature.getProperties()
  const danger = props.DEGRE_DANGER ?? null

  return {
    dangerValue: danger,
    dangerLabel: dangerLabelFromValue(danger),
    commune:
      props.COMMUNE ||
      props.NOM_COMMUNE ||
      props.COMMUNE_NOM ||
      props.COMMNAME ||
      null,
    id:
      props.OBJECTID ||
      props.FID ||
      props.ID ||
      null
  }
}

function buildSelectedAvalanchePayload(feature) {
  const data = extractAvalancheData(feature)
  const geometry = feature.getGeometry()
  const extent = geometry.getExtent()
  const center3857 = getCenter(extent)
  const [lon, lat] = toLonLat(center3857)

  return {
    ...data,
    lon,
    lat
  }
}

function showFeaturePopup(coordinate, mode, data) {
  if (!popupOverlay) return
  popupVisible.value = true
  popupMode.value = mode
  popupData.value = data
  popupOverlay.setPosition(coordinate)
}

function showSummitPopup(summit) {
  const center = summitToMapCoords(summit)
  showFeaturePopup(center, 'summit', summit)
}

function showPointPopup(point) {
  const coord = fromLonLat([point.lon, point.lat])
  showFeaturePopup(coord, 'point', point)
}

function showSummitOnMap(summit) {
  if (!summit || !mapInstance || !popupOverlay) return

  const center = summitToMapCoords(summit)

  mapInstance.getView().animate({
    center,
    zoom: 11,
    duration: 800
  })

  showSummitPopup(summit)
}

function centrerValais() {
  if (!mapInstance) return

  const center = fromLonLat([7.45, 46.15])

  mapInstance.getView().animate({
    center,
    zoom: 10,
    duration: 700
  })

  popupVisible.value = false
  popupData.value = null
  popupMode.value = null
  popupOverlay?.setPosition(undefined)
}

function mettreAJourProfilLigne(line) {
  if (!profileSource) return

  profileSource.clear()

  if (!line || line.length < 2) return

  const coords3857 = line.map(([x, y]) => lv95ToWebMercator(x, y))

  const feature = new Feature({
    geometry: new LineString(coords3857)
  })

  profileSource.addFeature(feature)
}

function mettreAJourPointClique(point) {
  if (!clickedPointSource) return

  clickedPointSource.clear()

  if (!point) return

  const feature = new Feature({
    geometry: new Point(fromLonLat([point.lon, point.lat]))
  })

  clickedPointSource.addFeature(feature)
}

function activerDessin() {
  if (!mapInstance) return

  drawSource.clear()

  if (drawInteraction) {
    mapInstance.removeInteraction(drawInteraction)
  }

  drawInteraction = new Draw({
    source: drawSource,
    type: 'LineString'
  })

  mapInstance.addInteraction(drawInteraction)

  drawInteraction.on('drawend', (event) => {
    const coords3857 = event.feature.getGeometry().getCoordinates()
    const coordsLV95 = coords3857.map(([x, y]) => webMercatorToLV95(x, y))

    emit('draw-line', coordsLV95)

    mapInstance.removeInteraction(drawInteraction)
    drawInteraction = null
  })
}

onMounted(async () => {
  await nextTick()

  const summitFeatures = props.summits.map(createSummitFeature)
  const built = await buildMap(mapEl.value, summitFeatures, popupEl.value)

  mapInstance = built.map
  popupOverlay = built.popupOverlay
  avalancheLayer = built.avalancheLayer
  mapReady = true

  updateDangerLayerVisibility(props.selectedDangerLayer)

  profileSource = new VectorSource()
  profileLayer = new VectorLayer({
    source: profileSource,
    style: new Style({
      stroke: new Stroke({
        color: '#dc2626',
        width: 3
      })
    })
  })
  profileLayer.setZIndex(200)
  mapInstance.addLayer(profileLayer)

  drawSource = new VectorSource()
  drawLayer = new VectorLayer({
    source: drawSource,
    style: new Style({
      stroke: new Stroke({
        color: '#2563eb',
        width: 3
      })
    })
  })
  drawLayer.setZIndex(300)
  mapInstance.addLayer(drawLayer)

  clickedPointSource = new VectorSource()
  clickedPointLayer = new VectorLayer({
    source: clickedPointSource,
    style: new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: '#dc2626' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    })
  })
  clickedPointLayer.setZIndex(400)
  mapInstance.addLayer(clickedPointLayer)

  mapInstance.updateSize()

  mapInstance.on('singleclick', (event) => {
    if (drawInteraction) return

    const [lon, lat] = toLonLat(event.coordinate)
    const [x, y] = webMercatorToLV95(event.coordinate[0], event.coordinate[1])

    const point = { lon, lat, x, y }
    emit('map-click', point)
  })

  if (props.selectedSummit) {
    showSummitOnMap(props.selectedSummit)
  }

  if (props.drawnLine) {
    mettreAJourProfilLigne(props.drawnLine)
  }

  if (props.clickedPoint) {
    mettreAJourPointClique(props.clickedPoint)
    showPointPopup(props.clickedPoint)
  }
})

function updateDangerLayerVisibility(layerId) {
  if (!avalancheLayer) return
  avalancheLayer.setVisible(layerId === 'avalanche')
}

watch(
  () => props.selectedSummit,
  (summit) => {
    if (!summit || !mapReady || props.clickedPoint) return
    showSummitOnMap(summit)
  }
)

watch(
  () => props.selectedDangerLayer,
  (layerId) => {
    updateDangerLayerVisibility(layerId)
  }
)

watch(
  () => props.drawnLine,
  (line) => {
    mettreAJourProfilLigne(line)
  },
  { deep: true }
)

watch(
  () => props.clickedPoint,
  (point) => {
    mettreAJourPointClique(point)

    if (point) {
      showPointPopup(point)
    }
  },
  { deep: true }
)
</script>