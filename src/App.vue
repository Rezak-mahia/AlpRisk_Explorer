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
          @select-summit="handleSelectSummit"
        />

        <ThreeDView :selected-summit="selectedSummit" />
      </div>

      <ElevationProfile :selected-summit="selectedSummit" />
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

function handleSelectSummit(summit) {
  selectedSummit.value = summit
}

onMounted(async () => {
  const response = await fetch('/summits.json')
  summits.value = await response.json()
  if (summits.value.length > 0) {
    selectedSummit.value = summits.value[0]
  }
})
</script>