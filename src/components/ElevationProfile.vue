<template>
  <div class="profile-container">
    <h2 class="panel-title">Profil d’altitude</h2>

    <p v-if="!selectedSummit" class="panel-empty">
      Sélectionne un sommet pour afficher le profil.
    </p>

    <p v-else class="status">
      Profil entre un point de départ simple et <strong>{{ selectedSummit.label }}</strong>.
    </p>

    <canvas ref="canvasEl"></canvas>

    <p v-if="loading" class="status">Chargement du profil…</p>
    <p v-if="error" class="status">{{ error }}</p>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { getElevationProfile } from '../services/geoAdmin.js'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  }
})

const canvasEl = ref(null)
const loading = ref(false)
const error = ref('')
let chart = null

function destroyChart() {
  if (chart) {
    chart.destroy()
    chart = null
  }
}

async function loadProfile(summit) {
  destroyChart()
  error.value = ''

  if (!summit) return

  loading.value = true

  try {
    const line = [
      [summit.startX, summit.startY],
      [summit.x, summit.y]
    ]

    const profile = await getElevationProfile(line, 120)

    const labels = profile.map((p) => Math.round(p.dist))
    const elevations = profile.map((p) => p.alts?.COMB ?? null)

    await nextTick()

    chart = new Chart(canvasEl.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Altitude (m)',
            data: elevations,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Distance (m)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Altitude (m)'
            }
          }
        }
      }
    })
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement du profil'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.selectedSummit,
  (summit) => {
    loadProfile(summit)
  },
  { immediate: true }
)
</script>

<style scoped>
.profile-container {
  position: relative;
  min-height: 0;
}

canvas {
  width: 100% !important;
  height: 170px !important;
}
</style>