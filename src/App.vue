<template>
  <div class="app-layout">
    <SummitSidebar
      :summits="summits"
      :selected-summit="selectedSummit"
      @select-summit="selectSummit"
    />

    <main class="main-panel">
      <div class="top-panel">
        <MapView
          :summits="summits"
          :selected-summit="selectedSummit"
          :clicked-point="clickedPoint"
          :drawn-line="drawnLine"
          @select-summit="selectSummit"
          @map-click="setClickedPoint"
          @draw-line="setDrawnLine"
        />

        <ThreeDView
          :selected-summit="selectedSummit"
          :clicked-point="clickedPoint"
          :drawn-line="drawnLine"
        />
      </div>

      <ElevationProfile
        :key="profileVersion"
        :selected-summit="selectedSummit"
        :drawn-line="drawnLine"
      />
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import SummitSidebar from './components/SummitSidebar.vue'
import MapView from './components/MapView.vue'
import ThreeDView from './components/ThreeDView.vue'
import ElevationProfile from './components/ElevationProfile.vue'

const summits = ref([])
const selectedSummit = ref(null)
const clickedPoint = ref(null)
const drawnLine = ref(null)
const profileVersion = ref(0)

function selectSummit(summit) {
  selectedSummit.value = summit
  clickedPoint.value = null
  drawnLine.value = null
  profileVersion.value += 1
}

function setClickedPoint(point) {
  clickedPoint.value = point
}

function setDrawnLine(line) {
  drawnLine.value = [...line]
  profileVersion.value += 1
}

onMounted(async () => {
  const response = await fetch('/summits.json')
  summits.value = await response.json()

  if (summits.value.length > 0) {
    selectedSummit.value = summits.value[0]
  }
})
</script>