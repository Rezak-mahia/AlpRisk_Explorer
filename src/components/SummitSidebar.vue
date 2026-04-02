<template>
  <aside class="sidebar">
    <h1 class="title">Analyse des dangers naturels en Valais</h1>

    <div class="info-box">
      <p><strong>Choisir un point d'intérêt</strong></p>
      <ul>
        <li>Saisissez des coordonnées <strong>MN95</strong></li>
        <li><strong>Cliquez</strong> sur la carte 2D</li>
      </ul>
    </div>

    <div class="mn95-section">
      <h2 class="section-label">Recherche MN95 (LV95)</h2>
      <div class="input-grid">
        <div class="field">
          <label>Est (E)</label>
          <input v-model.number="coordonneeEst" type="number" placeholder="ex: 2600000" class="no-spinner" />
        </div>
        <div class="field">
          <label>Nord (N)</label>
          <input v-model.number="coordonneeNord" type="number" placeholder="ex: 1200000" class="no-spinner" />
        </div>
      </div>
      <button class="btn-primary" @click="localiserCoordonnees">Localiser la saisie</button>
    </div>

    <div class="info-box">
      <p><strong>Choisir une couche</strong></p>
      <ul>
        <li>Choisissez un danger naturel dans le menu déroulant</li>
        <li>Les zones d'avalanche, de glissement ou d'hydrologie s'afficheront sur la carte</li>
      </ul>
    </div>

    <div class="layer-select-section">
      <h2 class="section-label">Couche de danger naturel</h2>
      <select v-model="idCoucheChoisie" @change="selectionnerCoucheDanger">
        <option v-for="couche in couchesDanger" :key="couche.id" :value="couche.id">
          {{ couche.label }}
        </option>
      </select>
    </div>

    <hr class="divider" />
  </aside>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { lv95ToLonLat as lv95VersLonLat } from '../services/projection.js'

const props = defineProps({
  coucheDangerSelectionnee: { type: String, default: null }
})

const emit = defineEmits(['selectionner-point', 'selectionner-couche-danger'])

const couchesDanger = [
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'glissement', label: 'Glissement' },
  { id: 'hydrologie', label: 'Hydrologie' }
]

const COUCHE_PAR_DEFAUT = couchesDanger[0].id

const idCoucheChoisie = ref(props.coucheDangerSelectionnee || COUCHE_PAR_DEFAUT)
const coordonneeEst = ref(null)
const coordonneeNord = ref(null)

watch(
  () => props.coucheDangerSelectionnee,
  (prochaineCouche) => {
    if (prochaineCouche) {
      idCoucheChoisie.value = prochaineCouche
    }
  }
)

onMounted(() => {
  if (!props.coucheDangerSelectionnee) selectionnerCoucheDanger()
})

function selectionnerCoucheDanger() {
  emit('selectionner-couche-danger', idCoucheChoisie.value)
}

function localiserCoordonnees() {
  const est = coordonneeEst.value
  const nord = coordonneeNord.value
  if (est == null || nord == null) return

  const { lon, lat } = lv95VersLonLat(est, nord)

  emit('selectionner-point', {
    label: `Coordonnées LV95 : ${est} / ${nord}`,
    lon,
    lat,
    x: est,
    y: nord
  })
}
</script>

<style scoped>
.sidebar {
  width: 300px;
  padding: 20px;
  background: #f8fafc;
  height: 100vh;
  overflow: hidden;
  border-right: 1px solid #e2e8f0;
}

.title {
  font-size: 1.4rem;
  margin-bottom: 15px;
  color: #1e293b;
  font-weight: bold;
}

.info-box {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.info-box ul {
  margin: 5px 0 0 18px;
  padding: 0;
}

.mn95-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.section-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 10px;
  font-weight: 600;
}

.input-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.field label {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: bold;
}

.field input {
  width: 100%;
  padding: 8px;
  font-size: 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}

.layer-select-section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.layer-select-section .section-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.layer-select-section select {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.95rem;
}

/* Suppression des flèches (spinners) pour les inputs number */
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.no-spinner {
  appearance: textfield;
  -moz-appearance: textfield;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 20px 0;
}
</style>
