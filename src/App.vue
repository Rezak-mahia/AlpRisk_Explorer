<template>
  <div class="app-layout">
    <SummitSidebar
      :summits="summits"
      :selected-summit="selectedSummit"
      @select-summit="handleSelectSummit"
    />

    <main class="main-panel">
      <div class="top-panel">
        <MapView
          :summits="summits"
          :selected-summit="selectedSummit"
          :drawn-line="drawnLine"
          @select-summit="handleSelectSummit"
          @draw-line="handleDrawLine"
        />

        <ThreeDView
          :selected-summit="selectedSummit"
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
import ElevationProfile from './components/ElevationProfile.vue'
import ThreeDView from './components/ThreeDView.vue'

const summits = ref([])
const selectedSummit = ref(null)
const drawnLine = ref(null)
const profileVersion = ref(0)

function handleSelectSummit(summit) {
  selectedSummit.value = summit
  drawnLine.value = null
  profileVersion.value += 1
}

function handleDrawLine(line) {
  drawnLine.value = [...line]
  profileVersion.value += 1
  console.log('NEW DRAWN LINE IN APP =', drawnLine.value)
}

onMounted(async () => {
  const response = await fetch('/summits.json')
  summits.value = await response.json()

  if (summits.value.length > 0) {
    selectedSummit.value = summits.value[0]
  }
})
</script>