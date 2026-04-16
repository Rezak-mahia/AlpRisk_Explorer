<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': !isSidebarOpen }">
    <aside class="sidebar" :class="{ collapsed: !isSidebarOpen }">
      <Sidebar
        :collapsed="!isSidebarOpen"
        :selected-danger-layer="selectedHazardType"
        @toggle-sidebar="toggleSidebarVisibility"
        @select-location="selectLocationFromSidebar"
        @select-danger-layer="selectHazardTypeFromSidebar"
      />
    </aside>

    <main class="main-panel">
      <section class="left-panel">
        <MapView
          :selected-location="selectedLocation"
          :selected-danger-layer="selectedHazardType"
          :clicked-point="clickedMapPoint"
          @map-click="processMapClick"
        />
      </section>

      <section class="right-panel">
        <ThreeDView
          :selected-location="selectedLocation"
          :clicked-point="clickedMapPoint"
          :selected-danger-layer="selectedHazardType"
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
const clickedMapPoint = ref(null)
const selectedHazardType = ref('avalanche')
const isSidebarOpen = ref(true)

function selectLocationFromSidebar(location) {
  clickedMapPoint.value = null
  selectedLocation.value = location
}

function processMapClick(point) {
  selectedLocation.value = null
  clickedMapPoint.value = point
}

function selectHazardTypeFromSidebar(hazardType) {
  selectedHazardType.value = hazardType
}

function toggleSidebarVisibility() {
  isSidebarOpen.value = !isSidebarOpen.value
}
</script>