<template>
  <div class="three-d-container">
    <h2 class="panel-title">Vue 3D (Cesium + swisstopo)</h2>
    <div ref="viewerEl" class="three-d-view"></div>
    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Viewer, Ion, Cartesian3, Math as CesiumMath,
  HeadingPitchRange, Color, CesiumTerrainProvider, VerticalOrigin
} from 'cesium'

const props = defineProps({
  selectedSummit: { type: Object, default: null }
})

const viewerEl = ref(null)
const status = ref('Initialisation de Cesium...')
let viewer = null
let summitEntity = null

const SWISSTOPO_TERRAIN_URL = 'https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/'

function flyToSummit(summit) {
  if (!viewer || !summit) return

  if (summitEntity) {
    viewer.entities.remove(summitEntity)
  }

  // Si l'altitude est inconnue (point manuel), on met 2000m par défaut pour le calcul du vol
  const alt = (summit.altitude === '?' || !summit.altitude) ? 2000 : summit.altitude

  summitEntity = viewer.entities.add({
    name: summit.label,
    position: Cartesian3.fromDegrees(summit.lon, summit.lat, alt),
    point: {
      pixelSize: 12,
      color: Color.RED,
      outlineColor: Color.WHITE,
      outlineWidth: 2,
      heightReference: 1 // CLAMP_TO_GROUND : force le point à être SUR le sol swisstopo
    },
    label: {
      text: summit.label,
      font: '12pt sans-serif',
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: { x: 0, y: -15 },
      heightReference: 1 // Le texte suit aussi le sol
    }
  })

  viewer.flyTo(summitEntity, {
    offset: new HeadingPitchRange(CesiumMath.toRadians(0), CesiumMath.toRadians(-30), 5000),
    duration: 2.0
  })
}

onMounted(async () => {
  try {
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNDU1OWQ2Yy1kNTBlLTQ4MDEtOGJkNS1mMzhiMDQ4ODg4ZjIiLCJpZCI6NDA1Nzk1LCJpYXQiOjE3NzM4NjY0NTJ9.zsVh_6IoIG7NqhDd6hGtgTyDBHN-tazruZXH4Cj3bss'

    const terrain = await CesiumTerrainProvider.fromUrl(SWISSTOPO_TERRAIN_URL, {
      requestVertexNormals: true
    })

    viewer = new Viewer(viewerEl.value, {
      terrainProvider: terrain,
      timeline: false, animation: false, baseLayerPicker: false,
      geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, fullscreenButton: false
    })

    if (props.selectedSummit) flyToSummit(props.selectedSummit)
    status.value = ''
  } catch (error) {
    console.error(error)
    status.value = "Erreur d'initialisation 3D"
  }
})

watch(() => props.selectedSummit, (summit) => {
  if (viewer && summit) flyToSummit(summit)
})

onBeforeUnmount(() => {
  if (viewer) { viewer.destroy(); viewer = null; }
})
</script>

<style scoped>
.three-d-container { display: flex; flex-direction: column; height: 100%; }
.three-d-view { width: 100%; height: 100%; min-height: 360px; }
.panel-title { padding: 10px; font-size: 1rem; background: #1e293b; color: white; margin: 0; }
.status { position: absolute; top: 50px; left: 20px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; }
</style>