const SEARCH_BASE_URL =
  'https://api3.geo.admin.ch/rest/services/ech/SearchServer'

const PROFILE_URL =
  'https://api3.geo.admin.ch/rest/services/profile.json'

export async function searchLocations(searchText) {
  const url = new URL(SEARCH_BASE_URL)
  url.searchParams.set('type', 'locations')
  url.searchParams.set('searchText', searchText)
  url.searchParams.set('returnGeometry', 'true')
  url.searchParams.set('sr', '2056')
  url.searchParams.set('limit', '10')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Erreur lors de la recherche geo.admin')
  }
  return response.json()
}

export async function getElevationProfile(lineCoordinates, nbPoints = 400) {
  const geom = {
    type: 'LineString',
    coordinates: lineCoordinates
  }

  const url = new URL(PROFILE_URL)
  url.searchParams.set('geom', JSON.stringify(geom))
  url.searchParams.set('sr', '2056')
  url.searchParams.set('nb_points', String(nbPoints))
  url.searchParams.set('distinct_points', 'true')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Erreur lors du chargement du profil d’altitude')
  }

  return response.json()
}