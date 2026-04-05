<template>
  <div class="app-layout">
    <aside class="sidebar">
      <Sidebar
        :selected-danger-layer="selectedDangerLayer"
        @select-location="handleSelectLocation"
        @select-danger-layer="handleSelectDangerLayer"
      />
    </aside>

    <main class="main-panel">
      <section class="left-panel">
        <MapView
          :selected-location="selectedLocation"
          :selected-danger-layer="selectedDangerLayer"
          :clicked-point="clickedPoint"
          @map-click="handleMapClick"
        />
      </section>

      <section class="right-panel">
        <ThreeDView
          :selected-location="selectedLocation"
          :clicked-point="clickedPoint"
          :selected-danger-layer="selectedDangerLayer"
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapView from './components/MapView.vue'
import ThreeDView from './components/ThreeDView.vue'
import Sidebar from './components/Sidebar.vue'

const selectedLocation = ref(null)
const clickedPoint = ref(null)
const selectedDangerLayer = ref('avalanche')

function handleSelectLocation(location) {
  clickedPoint.value = null
  selectedLocation.value = location
}

function handleMapClick(point) {
  selectedLocation.value = null
  clickedPoint.value = point
}

function handleSelectDangerLayer(layerId) {
  selectedDangerLayer.value = layerId
}
</script>