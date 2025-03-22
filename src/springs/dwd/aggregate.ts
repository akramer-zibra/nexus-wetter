import { stationsByLocation, forecastsByStations } from "./adapter"
import { type Station, type Forecast, type ForecastDataRecord } from "./types"

/** Gives an aggregat for forecasts if several stations match the selection params */
export const forecast = (lat: number, lng: number, radius: number): Promise<Forecast[]> => {

    return new Promise(async (resolve) => {

        // retrieve relevant station(s)
        const stations = await stationsByLocation(lat, lng, radius)

        // build a temporary index for station objects
        const indexStationsByCode: Record<string, Station> = {}
        stations.forEach(s => indexStationsByCode[s.code] = s)

        // retrieve relevant weather forecast for station(s)
        forecastsByStations(stations.map(s => s.code))
            .then((forecastData: ForecastDataRecord) => {

                const results: Forecast[] = []

                // aggregate forecast data with stations data
                Object.keys(indexStationsByCode).forEach((stationCode) => {
                    results.push({
                        station: indexStationsByCode[stationCode],
                        forecast: forecastData[stationCode],  
                    })                        
                })

                // Resolve aggregated data
                resolve(results)        
            })
    })
}