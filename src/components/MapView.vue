<template>
  <div class="map-container">
    <h2 class="panel-title">Carte des dangers naturels</h2>

    <div class="map-toolbar">
      <button @click="centrerValais">Centrer sur le Valais</button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div ref="popupEl" class="map-popup" v-show="isPopupVisible">
      <strong>Point sélectionné :</strong>
      <div>E: {{ Math.round(popupCoordinates?.x || 0) }}</div>
      <div>N: {{ Math.round(popupCoordinates?.y || 0) }}</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, nextTick } from 'vue'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import { Style, Stroke, Circle, Fill } from 'ol/style.js'
import { initializeMap, loadHazardLayer, preloadHazardLayers } from '../services/map.js'
import { convertWebMercatorToLV95 } from '../services/projection.js'

const props = defineProps({
  selectedLocation: {
    type: Object,
    default: null
  },
  selectedDangerLayer: {
    type: String,
    default: 'avalanche'
  },
  clickedPoint: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['map-click'])

const mapEl = ref(null)
const popupEl = ref(null)
const isPopupVisible = ref(false)
const popupCoordinates = ref(null)

let mapInstance = null
let popupOverlay = null
const hazardLayers = {
  avalanche: null,
  glissement: null,
  hydrologie: null
}
let activeHazardType = null
let selectionMarkerSource = null
let selectionMarkerLayer = null
let isMapInitialized = false

const SELECTION_MARKER_STYLE = new Style({
  image: new Circle({
    radius: 7,
    fill: new Fill({ color: '#dc2626' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 })
  })
})

function hidePopup() {
  isPopupVisible.value = false
  popupCoordinates.value = null
  popupOverlay?.setPosition(undefined)
}

function displayPopupAtPoint(point) {
  if (!popupOverlay || !point) return

  popupCoordinates.value = point
  isPopupVisible.value = true
  popupOverlay.setPosition(fromLonLat([point.lon, point.lat]))
}

function centerMapToValais() {
  if (!mapInstance) return

  mapInstance.getView().animate({
    center: fromLonLat([7.585, 46.150]),
    zoom: 8.87,
    duration: 700
  })

  hidePopup()
}

function centrerValais() {
  centerMapToValais()
}

async function activateHazardLayer(hazardType) {
  if (!mapInstance || activeHazardType === hazardType) return

  if (activeHazardType && hazardLayers[activeHazardType]) {
    hazardLayers[activeHazardType].setVisible(false)
  }

  let layer = hazardLayers[hazardType]
  if (!layer) {
    layer = await loadHazardLayer(hazardType)
    layer.setVisible(true)
    layer.setZIndex(20)
    mapInstance.addLayer(layer)
    hazardLayers[hazardType] = layer
  } else {
    layer.setVisible(true)
  }

  activeHazardType = hazardType
}

function clearSelectionMarker() {
  selectionMarkerSource?.clear()
}

function drawMarkerAtCoordinates(lon, lat) {
  if (!selectionMarkerSource) return

  selectionMarkerSource.clear()
  selectionMarkerSource.addFeature(
    new Feature({
      geometry: new Point(fromLonLat([lon, lat]))
    })
  )

  mapInstance?.render()
}

function displaySelectedLocation(location) {
  if (!mapInstance || !location) return

  const center = fromLonLat([location.lon, location.lat])

  mapInstance.getView().animate({
    center,
    zoom: 12,
    duration: 700
  })

  drawMarkerAtCoordinates(location.lon, location.lat)
  hidePopup()
}

function displayClickedPoint(point) {
  if (!mapInstance || !point) return

  drawMarkerAtCoordinates(point.lon, point.lat)
  displayPopupAtPoint(point)
}

function synchronizeMapState() {
  if (!isMapInitialized) return

  if (props.clickedPoint) {
    displayClickedPoint(props.clickedPoint)
    return
  }

  if (props.selectedLocation) {
    displaySelectedLocation(props.selectedLocation)
    return
  }

  clearSelectionMarker()
  hidePopup()
}

onMounted(async () => {
  await nextTick()

  const { map, popupOverlay: overlay, initialHazardLayer } = await initializeMap(
    mapEl.value,
    popupEl.value,
    props.selectedDangerLayer
  )

  mapInstance = map
  popupOverlay = overlay
  hazardLayers[props.selectedDangerLayer] = initialHazardLayer
  activeHazardType = props.selectedDangerLayer

  selectionMarkerSource = new VectorSource()
  selectionMarkerLayer = new VectorLayer({
    source: selectionMarkerSource,
    style: SELECTION_MARKER_STYLE
  })

  selectionMarkerLayer.setZIndex(400)
  mapInstance.addLayer(selectionMarkerLayer)
  mapInstance.updateSize()

  preloadHazardLayers(props.selectedDangerLayer).catch((error) => {
    console.error('Error preloading hazard layers in background:', error)
  })

  mapInstance.on('singleclick', async (event) => {
    try {
      const [lon, lat] = toLonLat(event.coordinate)
      const { x, y } = await convertWebMercatorToLV95(
        event.coordinate[0],
        event.coordinate[1]
      )

      emit('map-click', { lon, lat, x, y })
    } catch (error) {
      console.error('Error processing map click:', error)
    }
  })

  isMapInitialized = true
  synchronizeMapState()
})

watch(
  () => props.selectedDangerLayer,
  async (hazardType) => {
    await activateHazardLayer(hazardType)
    preloadHazardLayers(hazardType).catch((error) => {
      console.error('Error preloading hazard layers in background:', error)
    })
  }
)

watch(
  [() => props.selectedLocation, () => props.clickedPoint],
  async () => {
    await nextTick()
    synchronizeMapState()
  },
  { deep: true }
)
</script>