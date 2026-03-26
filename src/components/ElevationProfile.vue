<template>
  <div class="profile-container">
    <h2 class="panel-title">Profil d’altitude</h2>

    <p v-if="!selectedSummit" class="panel-empty">
      Sélectionne un sommet pour afficher le profil.
    </p>

    <p v-else class="status">
      <span v-if="drawnLine && drawnLine.length > 1">
        Profil calculé à partir de la ligne dessinée.
      </span>
      <span v-else>
        Profil automatique autour de <strong>{{ selectedSummit.label }}</strong>.
        Altitude officielle : {{ selectedSummit.altitude }} m
      </span>
    </p>

    <canvas ref="canvasEl"></canvas>

    <p v-if="loading" class="status">Chargement du profil…</p>
    <p v-if="error" class="status">{{ error }}</p>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { getElevationProfile } from '../services/geoAdmin.js'
import { lonLatToLV95 } from '../services/projection.js'

const props = defineProps({
  selectedSummit: {
    type: Object,
    default: null
  },
  drawnLine: {
    type: Array,
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

function buildAutomaticLine(summit) {
  const summitLV95 = lonLatToLV95(summit.lon, summit.lat)

  const dx = summitLV95.x - summit.startX
  const dy = summitLV95.y - summit.startY
  const dirLength = Math.sqrt(dx * dx + dy * dy)

  if (!dirLength || !isFinite(dirLength)) {
    throw new Error('Direction du profil invalide')
  }

  const ux = dx / dirLength
  const uy = dy / dirLength
  const halfDistance = 2000

  const start = [
    summitLV95.x - ux * halfDistance,
    summitLV95.y - uy * halfDistance
  ]

  const summitPoint = [summitLV95.x, summitLV95.y]

  const end = [
    summitLV95.x + ux * halfDistance,
    summitLV95.y + uy * halfDistance
  ]

  return [start, summitPoint, end]
}

async function loadProfile() {
  destroyChart()
  error.value = ''

  const summit = props.selectedSummit
  if (!summit) return

  loading.value = true

  try {
    const line =
      props.drawnLine && props.drawnLine.length > 1
        ? props.drawnLine
        : buildAutomaticLine(summit)

    const profile = await getElevationProfile(line, 400)

    if (!profile || profile.length === 0) {
      throw new Error('Aucune donnée de profil reçue')
    }

    const labels = profile.map((p) => Math.round(p.dist))
    const elevations = profile.map((p) => p.alts?.COMB ?? null)

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
            beginAtZero: false,
            title: {
              display: true,
              text: 'Altitude (m)'
            }
          }
        }
      }
    })
  } catch (e) {
    console.error(e)
    error.value = e.message || 'Erreur lors du chargement du profil'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfile()
})

watch(
  () => props.selectedSummit,
  () => {
    loadProfile()
  },
  { deep: true }
)

watch(
  () => props.drawnLine,
  () => {
    loadProfile()
  },
  { deep: true }
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