import proj4 from 'proj4'

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

export function lv95ToLonLat(x, y) {
  const [lon, lat] = proj4('EPSG:2056', 'EPSG:4326', [x, y])
  return { lon, lat }
}

export function webMercatorToLV95(x, y) {
  const [lon, lat] = proj4('EPSG:3857', 'EPSG:4326', [x, y])
  const [lv95x, lv95y] = proj4('EPSG:4326', 'EPSG:2056', [lon, lat])
  return [lv95x, lv95y]
}

export function lv95ToWebMercator(x, y) {
  const [lon, lat] = proj4('EPSG:2056', 'EPSG:4326', [x, y])
  const [mx, my] = proj4('EPSG:4326', 'EPSG:3857', [lon, lat])
  return [mx, my]
}