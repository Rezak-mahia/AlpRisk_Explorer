<template>
  <div class="map-container">
    <div class="map-toolbar">
      <button @click="resetView">Recentrer la Suisse</button>
      <button @click="activateDraw">Dessiner un profil</button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div ref="popupEl" class="map-popup" v-show="popupVisible">
      <strong>{{ popupData?.label }}</strong>
      <div>{{ popupData?.altitude }} m</div>
      <div>{{ popupData?.canton }}</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import { fromLonLat } from 'ol/proj.js'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import Draw from 'ol/interaction/Draw.js'
import { Style, Stroke } from 'ol/style.js'
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
  drawnLine: {
    type: Array,
    default: null
  }
})

const emit = defineEmits(['select-summit', 'draw-line'])

const mapEl = ref(null)
const popupEl = ref(null)
const popupVisible = ref(false)
const popupData = ref(null)

let mapInstance = null
let popupOverlay = null
let mapReady = false

let profileSource = null
let profileLayer = null

let drawSource = null
let drawLayer = null
let drawInteraction = null

function summitToMapCoords(summit) {
  return fromLonLat([summit.lon, summit.lat])
}

function showSummitOnMap(summit) {
  if (!summit || !mapInstance || !popupOverlay) return

  const center = summitToMapCoords(summit)

  mapInstance.getView().animate({
    center,
    zoom: 11,
    duration: 800
  })

  popupVisible.value = true
  popupData.value = summit
  popupOverlay.setPosition(center)
}

function resetView() {
  if (!mapInstance) return

  mapInstance.getView().animate({
    center: fromLonLat([8.23, 46.82]),
    zoom: 8,
    duration: 700
  })

  popupVisible.value = false
  popupData.value = null
  popupOverlay?.setPosition(undefined)
}

function updateProfileLine(line) {
  if (!profileSource) return

  profileSource.clear()

  if (!line || line.length < 2) return

  const coords3857 = line.map(([x, y]) => lv95ToWebMercator(x, y))

  const feature = new Feature({
    geometry: new LineString(coords3857)
  })

  profileSource.addFeature(feature)
}

function activateDraw() {
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

    const coordsLV95 = coords3857.map(([x, y]) =>
      webMercatorToLV95(x, y)
    )

    console.log('DRAWN LINE LV95 =', coordsLV95)

    emit('draw-line', coordsLV95)

    mapInstance.removeInteraction(drawInteraction)
    drawInteraction = null
  })
}

onMounted(async () => {
  await nextTick()

  const features = props.summits.map(createSummitFeature)
  const built = await buildMap(mapEl.value, features, popupEl.value)

  mapInstance = built.map
  popupOverlay = built.popupOverlay
  mapReady = true

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

  mapInstance.updateSize()

  mapInstance.on('singleclick', (event) => {
    let found = false

    mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
      const summit = feature.get('summit')
      if (summit) {
        found = true
        emit('select-summit', summit)
      }
    })

    if (!found) {
      popupVisible.value = false
      popupData.value = null
      popupOverlay.setPosition(undefined)
    }
  })

  if (props.selectedSummit) {
    showSummitOnMap(props.selectedSummit)
  }

  if (props.drawnLine) {
    updateProfileLine(props.drawnLine)
  }
})

watch(
  () => props.selectedSummit,
  (summit) => {
    if (!summit || !mapReady) return
    showSummitOnMap(summit)
  }
)

watch(
  () => props.drawnLine,
  (line) => {
    updateProfileLine(line)
  },
  { deep: true }
)
</script>