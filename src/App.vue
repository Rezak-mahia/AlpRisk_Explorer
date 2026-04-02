<template>
  <div class="app-layout">
    <aside class="sidebar">
      <SummitSidebar
        :summits="summits"
        :selected-summit="selectedSummit"
        :selected-danger-layer="selectedDangerLayer"
        @select-summit="handleSelectSummit"
        @select-danger-layer="handleSelectDangerLayer"
      />
    </aside>

    <main class="main-panel">
      <section class="left-panel">
        <MapView
          :summits="summits"
          :selected-summit="selectedSummit"
          :selected-danger-layer="selectedDangerLayer"
          :clicked-point="clickedPoint"
          :drawn-line="drawnLine"
          @map-click="handleMapClick"
          @draw-line="handleDrawLine"
          @select-avalanche="handleSelectAvalanche"
        />

        <ElevationProfile :line-coordinates="drawnLine" />
      </section>

      <section class="right-panel">
        <ThreeDView
          :clicked-point="clickedPoint"
          :drawn-line="drawnLine"
          :selected-avalanche="selectedAvalanche"
          :selected-danger-layer="selectedDangerLayer"
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MapView from './components/MapView.vue'
import ThreeDView from './components/ThreeDView.vue'
import SummitSidebar from './components/SummitSidebar.vue'
import ElevationProfile from './components/ElevationProfile.vue'

const summits = ref([])
const clickedPoint = ref(null)
const drawnLine = ref(null)
const selectedAvalanche = ref(null)
const selectedDangerLayer = ref('avalanche')

async function loadSummits() {
  try {
    const response = await fetch('/summits.json')
    if (!response.ok) {
      throw new Error('Erreur lors du chargement de summits.json')
    }
    summits.value = await response.json()
  } catch (error) {
    console.error(error)
    summits.value = []
  }
}

function handleSelectPoint(point) {
  clickedPoint.value = point
  selectedAvalanche.value = null
}

function handleMapClick(point) {
  clickedPoint.value = point
  selectedAvalanche.value = null
}

function handleDrawLine(line) {
  drawnLine.value = line
}

function handleSelectAvalanche(avalanche) {
  selectedAvalanche.value = avalanche
  clickedPoint.value = null
}

function handleSelectDangerLayer(layerId) {
  selectedDangerLayer.value = layerId
}

onMounted(() => {
  loadSummits()
})
</script>