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

function transformCoordinates(sourceEpsg, targetEpsg, coordinates) {
  return proj4(sourceEpsg, targetEpsg, coordinates)
}

export function lv95ToLonLat(x, y) {
  const [lon, lat] = transformCoordinates(EPSG_LV95, EPSG_WGS84, [x, y])
  return { lon, lat }
}

export function webMercatorToLV95(x, y) {
  const [lon, lat] = transformCoordinates(EPSG_WEB_MERCATOR, EPSG_WGS84, [x, y])
  const [lv95x, lv95y] = transformCoordinates(EPSG_WGS84, EPSG_LV95, [lon, lat])
  return [lv95x, lv95y]
}