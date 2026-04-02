<template>
  <div class="profile-container">
    <h2 class="panel-title">Profil d’altitude</h2>

    <p v-if="status" class="status">{{ status }}</p>

    <div v-else-if="profilePoints.length === 0" class="panel-empty">
      Dessine une ligne sur la carte pour afficher le profil.
    </div>

    <div v-else class="profile-wrapper">
      <svg
        class="profile-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="none"
      >
        <polyline
          :points="polylinePoints"
          fill="none"
          stroke="#2563eb"
          stroke-width="2"
        />

        <line
          :x1="paddingLeft"
          :x2="paddingLeft"
          :y1="paddingTop"
          :y2="svgHeight - paddingBottom"
          stroke="#9ca3af"
          stroke-width="1"
        />

        <line
          :x1="paddingLeft"
          :x2="svgWidth - paddingRight"
          :y1="svgHeight - paddingBottom"
          :y2="svgHeight - paddingBottom"
          stroke="#9ca3af"
          stroke-width="1"
        />

        <text :x="paddingLeft" :y="paddingTop - 6" font-size="11" fill="#374151">
          {{ Math.round(maxElevation) }} m
        </text>

        <text
          :x="paddingLeft"
          :y="svgHeight - paddingBottom + 16"
          font-size="11"
          fill="#374151"
        >
          0 km
        </text>

        <text
          :x="svgWidth - paddingRight - 42"
          :y="svgHeight - paddingBottom + 16"
          font-size="11"
          fill="#374151"
        >
          {{ totalDistanceKm.toFixed(1) }} km
        </text>
      </svg>

      <div class="profile-meta">
        <span class="badge">Distance : {{ totalDistanceKm.toFixed(2) }} km</span>
        <span class="badge">Min : {{ Math.round(minElevation) }} m</span>
        <span class="badge">Max : {{ Math.round(maxElevation) }} m</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getElevationProfile } from '../services/geoAdmin.js'

const props = defineProps({
  lineCoordinates: {
    type: Array,
    default: null
  }
})

const status = ref('')
const profilePoints = ref([])

const svgWidth = 900
const svgHeight = 220
const paddingLeft = 36
const paddingRight = 12
const paddingTop = 18
const paddingBottom = 30

const minElevation = computed(() => {
  if (!profilePoints.value.length) return 0
  return Math.min(...profilePoints.value.map((p) => p.elevation))
})

const maxElevation = computed(() => {
  if (!profilePoints.value.length) return 0
  return Math.max(...profilePoints.value.map((p) => p.elevation))
})

const totalDistance = computed(() => {
  if (!profilePoints.value.length) return 0
  return profilePoints.value[profilePoints.value.length - 1].distance
})

const totalDistanceKm = computed(() => totalDistance.value / 1000)

const polylinePoints = computed(() => {
  if (!profilePoints.value.length) return ''

  const usableWidth = svgWidth - paddingLeft - paddingRight
  const usableHeight = svgHeight - paddingTop - paddingBottom
  const elevRange = Math.max(maxElevation.value - minElevation.value, 1)
  const distRange = Math.max(totalDistance.value, 1)

  return profilePoints.value
    .map((point) => {
      const x = paddingLeft + (point.distance / distRange) * usableWidth
      const y =
        paddingTop +
        (1 - (point.elevation - minElevation.value) / elevRange) * usableHeight
      return `${x},${y}`
    })
    .join(' ')
})

function getElevationFromPoint(point) {
  return Number(
    point.altitude ??
      point.z ??
      point.combined ??
      point.elevation ??
      point.alts?.COMB ??
      point.ALTITUDE ??
      0
  )
}

function getDistanceFromPoint(point) {
  return Number(
    point.dist ??
      point.distance ??
      point.DISTANCE ??
      point.m ??
      0
  )
}

function normalizeProfileResult(result) {
  if (!Array.isArray(result) || result.length === 0) {
    return []
  }

  let previousX = null
  let previousY = null
  let runningDistance = 0

  return result.map((point, index) => {
    const x = Number(point.easting ?? point.x ?? point.X ?? 0)
    const y = Number(point.northing ?? point.y ?? point.Y ?? 0)
    const elevation = getElevationFromPoint(point)

    let distance = getDistanceFromPoint(point)

    if (!distance && index > 0 && previousX != null && previousY != null) {
      const dx = x - previousX
      const dy = y - previousY
      runningDistance += Math.sqrt(dx * dx + dy * dy)
      distance = runningDistance
    } else if (distance) {
      runningDistance = distance
    }

    previousX = x
    previousY = y

    return {
      distance,
      elevation
    }
  })
}

async function loadProfile(lineCoordinates) {
  if (!lineCoordinates || lineCoordinates.length < 2) {
    profilePoints.value = []
    status.value = ''
    return
  }

  try {
    status.value = 'Chargement du profil...'
    const result = await getElevationProfile(lineCoordinates, 400)
    profilePoints.value = normalizeProfileResult(result)
    status.value = ''
  } catch (error) {
    console.error(error)
    profilePoints.value = []
    status.value = "Erreur lors du chargement du profil d'altitude"
  }
}

watch(
  () => props.lineCoordinates,
  (line) => {
    loadProfile(line)
  },
  { deep: true, immediate: true }
)
</script>

<style scoped>
.profile-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.profile-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.profile-svg {
  width: 100%;
  height: 100%;
  min-height: 150px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>