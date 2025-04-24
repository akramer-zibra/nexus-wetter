import * as htmlparser2 from "htmlparser2"
import { decode } from "html-entities"
import memoize from "memoize"
import { formatISO } from "date-fns";
import haversine from 'haversine-distance'

import { type Station, type ForecastDataRecord, type StationWithDistance } from "."
import { fetchStationForecasts, fetchStationList } from "./api"

/* Helper function to change date format from de to ISO */
const deToIsoDate = (date: string): string => {
    const deStr = date.split('.') // e.g. 18.03.2025
    return formatISO(new Date(parseInt(deStr[2]), parseInt(deStr[1]), parseInt(deStr[0])), { representation: 'date' })
}

/** Helper function to build a fast  parser which extracts data from html */
const buildParser = (result: Station[], filter: Function) => {

    // Initialize default
    let cursor: {
        row: number,
        column: number,
    } = {
        row: 1,
        column: 0 // Start unknown column
    }

    const defaults: Station = {name: '', id: '', code: '', lat: 0.0, lng: 0.0, altitude: 0, recency: ''}
    let data: Station = {...defaults} // Initialize with defaults

    // Define a html parser for station html
    return new htmlparser2.Parser({
        onopentag(tagname) {
            
            // Skip header row
            if (cursor.row === 1) { return; }

            // Initialize data with defaults
            if (tagname === "tr") { data = {...defaults} }

            // Move cursor to next column
            if (tagname === "td") { cursor.column++ }            
        },
        ontext(text) {

            // Skip header
            if (cursor.row === 1) { return; }

            // Extract certain data
            if (cursor.column === 1) { data.name = decode(text.trim()); return; }
            if (cursor.column === 2) { data.id = text.trim(); return; }
            if (cursor.column === 4) { data.code = text.trim(); return; }
            if (cursor.column === 5) { data.lat = parseFloat(text.trim()); return; }
            if (cursor.column === 6) { data.lng = parseFloat(text.trim()); return; }
            if (cursor.column === 7) { data.altitude = parseInt(text.trim()); return; }
            if (cursor.column === 11) { data.recency = text.trim(); return; }
        },
        onclosetag(tagname) {

            if (tagname === "tr") {
            
                // Check criterias station name and activeness etc.
                if (filter(data)) {
                    result.push({...data}) // Flush extracted data to results
                }

                // Move cursor to next row and reset column
                cursor.row++;
                cursor.column = 0; // Reset to unknown
                return;
            }
        },
    }, {
        decodeEntities: false,        
    })
}

/** 
 * Gives stations relevant to place with a certain recency of measurements
 */
const internalStationsByName = async (place: string, recency?: number): Promise<Station[]> => {

    // collection with results
    const result: Station[] = []

    // Define filter function for the data retrieval
    const filter = (data: Station): boolean => {
        
        // Prepare date calculations
        const endDeStr = data.recency.split('.') // e.g. 18.03.2025
        const endDateTsp: number = Date.parse(`${endDeStr[2]}-${endDeStr[1]}-${endDeStr[0]}`) // e.g. 2025-03-18

        // Check if name contains the search term
        const nameMatches = data.name.toLowerCase().indexOf(place.toLowerCase()) >= 0
        
        // Check recency only if it's defined
        const recencyMatches = recency === undefined || 
            (endDateTsp + (1000 * 60 * 60 * 24) * recency > Date.now())
            
        return nameMatches && recencyMatches // Both conditions must be true
    }

    // build a custom parser
    const parser = buildParser(result, filter)

    // fetch (cached) station list html text
    const htmlStr: string = await fetchStationList()

    // Write html to parser
    parser.write(htmlStr)
    parser.end()

    // Mapping: Normalize german date format to ISO format
    result.forEach((station => { station.recency = deToIsoDate(station.recency); }))

    return result

}
//
export const stationsByName = memoize(internalStationsByName, { 
    maxAge: 1000 * 60 * 60 * 24, // data may change once every 24h
    cacheKey: (arguments_) => ""+arguments_[1]+":"+arguments_[0] // simple string concatenation 
})

/** 
 * Retrieve stations by given geo location and range 
 */
const internalStationsByLocation = async (lat: number, lng: number, range: number, recency?: number): Promise<Station[]> => {

    // collection with results
    const result: Station[] = []

    // Define filter function
    const filter = (data: Station): boolean => {
        
        // Prepare date calculations
        const endDeStr = data.recency.split('.') // e.g. 18.03.2025
        const endDateTsp: number = Date.parse(`${endDeStr[2]}-${endDeStr[1]}-${endDeStr[0]}`) // e.g. 2025-03-18

        // Check if distance matches the range condition
        const distanceMatches = haversine([lat, lng], [data.lat, data.lng]) <= range * 1000 // distance in meters

        // Check if recency condition matches only if its set
        const recencyMatches = recency === undefined || 
            (endDateTsp + (1000 * 60 * 60 * 24) * recency > Date.now())

        return distanceMatches && recencyMatches // Both conditions must be true
    }

    // build a custom parser
    const parser = buildParser(result, filter)

    // fetch (cached) station list html text
    const htmlStr: string = await fetchStationList()

    // Write html to parser
    parser.write(htmlStr)
    parser.end()

    // Mapping: Normalize german date format to ISO format
    result.forEach((station => { station.recency = deToIsoDate(station.recency); }))

    return result
}
//
export const stationsByLocation = memoize(internalStationsByLocation, {
    maxAge: 1000 * 60 * 60 * 24, // data may change once every 24h
    cacheKey: (arguments_) => ""+arguments_[0]+":"+arguments_[1]+":"+arguments_[2]+":"+arguments_[3]
})

/** 
 * Retrieves stations by location with calculated distance 
 */
export const internalStationsByLocationWithDistance = async (lat: number, lng: number, range: number, recency?: number): Promise<StationWithDistance[]> => {

    // retrieve relevant station(s) in range
    const stations = await stationsByLocation(lat, lng, range, recency)

    // Map results to certain result interface
    return stations.map(station => {
        return {
            point: {
                lat,
                lng
            },
            distance: haversine([lat, lng], [station.lat, station.lng]) / 1000, // Calculate distance in km 
            station: station,
        }
    })
}
//
export const stationsByLocationWithDistance = memoize(internalStationsByLocationWithDistance, {
    maxAge: 1000 * 60 * 60 * 24, // data may change once every 24h
    cacheKey: (arguments_) => ""+arguments_[0]+":"+arguments_[1]+":"+arguments_[2]+":"+arguments_[3]
})

/* 
 * Retrieve forecast for given stations 
 */
const internalForecastsForStations = async (stationCodes: string[]): Promise<ForecastDataRecord> => {

    // Fetch multiple forecasts at once
    const data = await fetchStationForecasts(stationCodes); // Use station codes to fetch forecasts
    const indexes = Object.keys(data);

    // Define result object
    const forecastDataRecords: ForecastDataRecord = {}
    
    // Map retrieved forcast data
    Object.values(data).forEach((forecastByStastion, idx) => {
        // Create a new record for each station forecast
        forecastDataRecords[indexes[idx]] = {
            days: forecastByStastion.days.map((dayForecast: any) => { 
                return {
                    date: dayForecast.dayDate,
                    temperatureMin: dayForecast.temperatureMin / 10, // Convert to Celcius with one decimal position
                    temperatureMax: dayForecast.temperatureMax / 10, // Convert to Celcius with one decimal position
                    temperatureUnit: "°C",
                    precipitation: dayForecast.precipitation,
                    icon: dayForecast.icon                    
                }
            }),
            // steps: null,
            // warnings: null
        }
    })

    // Return mapped data structure
    return forecastDataRecords
}
//
export const forecastsByStations = memoize(internalForecastsForStations)