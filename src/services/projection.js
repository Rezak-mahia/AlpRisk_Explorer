import proj4 from 'proj4'

const EPSG_WGS84 = 'EPSG:4326'
const EPSG_LV95 = 'EPSG:2056'
const EPSG_WEB_MERCATOR = 'EPSG:3857'

proj4.defs(
  EPSG_LV95,
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 ' +
    '+x_0=2600000 +y_0=1200000 +ellps=bessel ' +
    '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs'
)

function transformer(sourceEpsg, targetEpsg, coordonnees) {
  return proj4(sourceEpsg, targetEpsg, coordonnees)
}

export function lonLatToLV95(lon, lat) {
  const [x, y] = transformer(EPSG_WGS84, EPSG_LV95, [lon, lat])
  return { x, y }
}

export function lv95ToLonLat(x, y) {
  const [lon, lat] = transformer(EPSG_LV95, EPSG_WGS84, [x, y])
  return { lon, lat }
}

export function webMercatorToLV95(x, y) {
  const [lon, lat] = transformer(EPSG_WEB_MERCATOR, EPSG_WGS84, [x, y])
  const [lv95x, lv95y] = transformer(EPSG_WGS84, EPSG_LV95, [lon, lat])
  return [lv95x, lv95y]
}

export function lv95ToWebMercator(x, y) {
  const [lon, lat] = transformer(EPSG_LV95, EPSG_WGS84, [x, y])
  const [mx, my] = transformer(EPSG_WGS84, EPSG_WEB_MERCATOR, [lon, lat])
  return [mx, my]
}