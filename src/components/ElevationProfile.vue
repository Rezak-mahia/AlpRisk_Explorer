<template>
  <div class="profile-container">
    <h2 class="panel-title">Profil d’altitude</h2>

    <p v-if="!selectedSummit" class="panel-empty">
      Sélectionne un sommet pour afficher le profil.
    </p>

    <p v-else class="status">
      Profil centré sur <strong>{{ selectedSummit.label }}</strong>.
      Altitude officielle : {{ selectedSummit.altitude }} m
    </p>

    <canvas ref="canvasEl"></canvas>

    <p v-if="loading" class="status">Chargement du profil…</p>
    <p v-if="error" class="status">{{ error }}</p>

    <div v-if="debugInfo" class="status">
      <div>Sommet LV95 : {{ Math.round(debugInfo.summitX) }}, {{ Math.round(debugInfo.summitY) }}</div>
      <div>Altitude max du profil : {{ Math.round(debugInfo.maxProfile) }} m</div>
      <div>Altitude au point sommet : {{ Math.round(debugInfo.summitElevation) }} m</div>
      <div>Index du sommet dans le profil : {{ debugInfo.summitIndex }}</div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { getElevationProfile } from '../services/geoAdmin.js'
import { lonLatToLV95 } from '../services/projection.js'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  }
})

const canvasEl = ref(null)
const loading = ref(false)
const error = ref('')
const debugInfo = ref(null)
let chart = null

function destroyChart() {
  if (chart) {
    chart.destroy()
    chart = null
  }
}

function findClosestProfilePoint(profile, summitX, summitY) {
  let bestIndex = -1
  let bestDistance = Infinity

  profile.forEach((p, i) => {
    const px = p.easting ?? p.x ?? null
    const py = p.northing ?? p.y ?? null

    if (px === null || py === null) return

    const dx = px - summitX
    const dy = py - summitY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < bestDistance) {
      bestDistance = dist
      bestIndex = i
    }
  })

  return bestIndex
}

async function loadProfile(summit) {
  destroyChart()
  error.value = ''
  debugInfo.value = null

  if (!summit) return

  loading.value = true

  try {
    const summitLV95 = lonLatToLV95(summit.lon, summit.lat)

    // Direction du profil : depuis le point de départ vers le sommet converti
    const dx = summitLV95.x - summit.startX
    const dy = summitLV95.y - summit.startY
    const dirLength = Math.sqrt(dx * dx + dy * dy)

    if (!dirLength || !isFinite(dirLength)) {
      throw new Error('Direction du profil invalide')
    }

    const ux = dx / dirLength
    const uy = dy / dirLength

    // 2 km avant / 2 km après le sommet
    const halfDistance = 2000

    const startCentered = [
      summitLV95.x - ux * halfDistance,
      summitLV95.y - uy * halfDistance
    ]

    const summitPoint = [summitLV95.x, summitLV95.y]

    const endCentered = [
      summitLV95.x + ux * halfDistance,
      summitLV95.y + uy * halfDistance
    ]

    // IMPORTANT : on inclut explicitement le sommet dans la ligne
    const line = [startCentered, summitPoint, endCentered]

    const profile = await getElevationProfile(line, 400)

    const labels = profile.map((p) => Math.round(p.dist))
    const elevations = profile.map((p) => p.alts?.COMB ?? null)

    // Trouver l’index du point du profil le plus proche du sommet
    const summitIndex = findClosestProfilePoint(profile, summitLV95.x, summitLV95.y)

    const summitDataset = new Array(labels.length).fill(null)
    let summitProfileElevation = null

    if (summitIndex >= 0 && summitIndex < elevations.length) {
      summitProfileElevation = elevations[summitIndex]
      summitDataset[summitIndex] = summitProfileElevation
    }

    const validElevations = elevations.filter((v) => v !== null)
    const maxProfile = validElevations.length > 0 ? Math.max(...validElevations) : 0
    const maxY = Math.max(maxProfile, summit.altitude || 0) + 200

    debugInfo.value = {
      summitX: summitLV95.x,
      summitY: summitLV95.y,
      maxProfile,
      summitElevation: summitProfileElevation || 0,
      summitIndex
    }

    await nextTick()

    chart = new Chart(canvasEl.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Profil terrain (m)',
            data: elevations,
            tension: 0.2,
            pointRadius: 0
          },
          {
            label: `Sommet dans le profil : ${summit.label}`,
            data: summitDataset,
            showLine: false,
            pointRadius: 6,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                if (context.datasetIndex === 1) {
                  return `${summit.label} : ${summitProfileElevation} m (point sommet du profil)`
                }
                return `Altitude : ${context.parsed.y} m`
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Distance (m)'
            }
          },
          y: {
            beginAtZero: false,
            suggestedMax: maxY,
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