import proj4 from 'proj4'

// Définition EPSG:2056 (LV95)
proj4.defs(
  'EPSG:2056',
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 ' +
    '+x_0=2600000 +y_0=1200000 +ellps=bessel ' +
    '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs'
)

export function lonLatToLV95(lon, lat) {
  const [x, y] = proj4('EPSG:4326', 'EPSG:2056', [lon, lat])
  return { x, y }
}