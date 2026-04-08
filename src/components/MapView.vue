<template>
  <div class="map-container">
    <h2 class="panel-title">Carte 2D des dangers naturels</h2>

    <div class="map-toolbar">
      <button @click="centrerValais">Centrer sur le Valais</button>
    </div>

    <div ref="mapEl" class="map"></div>

    <div ref="popupEl" class="map-popup" v-show="popupVisible">
      <strong>Point sélectionné</strong>
      <div>E : {{ Math.round(popupData?.x || 0) }}</div>
      <div>N : {{ Math.round(popupData?.y || 0) }}</div>
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
import { buildMap, loadDangerLayer, preloadDangerLayers } from '../services/map.js'
import { webMercatorToLV95 } from '../services/projection.js'

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
const popupVisible = ref(false)
const popupData = ref(null)

let mapInstance = null
let popupOverlay = null
const dangerLayers = {
  avalanche: null,
  glissement: null,
  hydrologie: null
}
let activeDangerLayerId = null
let clickedPointSource = null
let clickedPointLayer = null
let mapReady = false

function resetPopup() {
  popupVisible.value = false
  popupData.value = null
  popupOverlay?.setPosition(undefined)
}

function showPointPopup(point) {
  if (!popupOverlay || !point) return

  popupData.value = point
  popupVisible.value = true
  popupOverlay.setPosition(fromLonLat([point.lon, point.lat]))
}

function centrerValais() {
  if (!mapInstance) return

  mapInstance.getView().animate({
    center: fromLonLat([7.585, 46.150]),
    zoom: 8.87,
    duration: 700
  })

  resetPopup()
}

async function setActiveDangerLayer(layerId) {
  if (!mapInstance) return
  if (activeDangerLayerId === layerId) return

  if (activeDangerLayerId && dangerLayers[activeDangerLayerId]) {
    dangerLayers[activeDangerLayerId].setVisible(false)
  }

  let layer = dangerLayers[layerId]
  if (!layer) {
    layer = await loadDangerLayer(layerId)
    layer.setVisible(true)
    layer.setZIndex(20)
    mapInstance.addLayer(layer)
    dangerLayers[layerId] = layer
  } else {
    layer.setVisible(true)
  }

  activeDangerLayerId = layerId
}

function clearRedPoint() {
  clickedPointSource?.clear()
}

function drawRedPointFromLonLat(lon, lat) {
  if (!clickedPointSource) return

  clickedPointSource.clear()
  clickedPointSource.addFeature(
    new Feature({
      geometry: new Point(fromLonLat([lon, lat]))
    })
  )

  mapInstance?.render()
}

function showSelectedLocationOnMap(location) {
  if (!mapInstance || !location) return

  const center = fromLonLat([location.lon, location.lat])

  mapInstance.getView().animate({
    center,
    zoom: 12,
    duration: 700
  })

  drawRedPointFromLonLat(location.lon, location.lat)
  resetPopup()
}

function showClickedPointOnMap(point) {
  if (!mapInstance || !point) return

  drawRedPointFromLonLat(point.lon, point.lat)
  showPointPopup(point)
}

function syncMapState() {
  if (!mapReady) return

  if (props.clickedPoint) {
    showClickedPointOnMap(props.clickedPoint)
    return
  }

  if (props.selectedLocation) {
    showSelectedLocationOnMap(props.selectedLocation)
    return
  }

  clearRedPoint()
  resetPopup()
}

onMounted(async () => {
  await nextTick()

  const built = await buildMap(mapEl.value, popupEl.value, props.selectedDangerLayer)

  mapInstance = built.map
  popupOverlay = built.popupOverlay
  dangerLayers[props.selectedDangerLayer] = built.initialDangerLayer
  activeDangerLayerId = props.selectedDangerLayer

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

  preloadDangerLayers(props.selectedDangerLayer).catch((error) => {
    console.error('Préchargement des couches en arrière-plan échoué', error)
  })

  mapInstance.on('singleclick', async (event) => {
    try {
      const [lon, lat] = toLonLat(event.coordinate)
      const { x, y } = await webMercatorToLV95(
        event.coordinate[0],
        event.coordinate[1]
      )

      emit('map-click', { lon, lat, x, y })
    } catch (error) {
      console.error(error)
    }
  })

  mapReady = true
  syncMapState()
})

watch(
  () => props.selectedDangerLayer,
  async (layerId) => {
    await setActiveDangerLayer(layerId)
    preloadDangerLayers(layerId).catch((error) => {
      console.error('Préchargement des couches en arrière-plan échoué', error)
    })
  }
)

watch(
  [() => props.selectedLocation, () => props.clickedPoint],
  async () => {
    await nextTick()
    syncMapState()
  },
  { deep: true }
)
</script>