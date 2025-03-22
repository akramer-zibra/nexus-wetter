import * as htmlparser2 from "htmlparser2"
import { decode } from "html-entities"
import memoize from "memoize"
import { formatISO } from "date-fns";
import haversine from 'haversine-distance'

import { type Station, type ForecastData, type ForecastDataRecord } from "./types"
import { fetchStationForecasts, fetchStationList } from "./port"

/* Helper function to change date format from de to ISO */
const deToIsoDate = (date: string): string => {
    const deStr = date.split('.') // e.g. 18.03.2025
    return formatISO(new Date(parseInt(deStr[2]), parseInt(deStr[1]), parseInt(deStr[0])), { representation: 'date' })
}

const buildParser = (result: Station[], filter: Function) => {

    // Initialize default
    let cursor: {
        row: number,
        column: number,
    } = {
        row: 1,
        column: 0 // Start unknown column
    }

    const defaults: Station = {name: '', id: '', code: '', lat: 0.0, lng: 0.0, altitude: 0, lastContact: ''}
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
            if (cursor.column === 11) { data.lastContact = text.trim(); return; }
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
 * --------------------------------------
 */
const memoizedStationsByName = memoize(async (place: string, isActive: boolean) => {

    // collection with results
    const result: Station[] = []

    // Define filter function for the data retrieval
    const filter = (data: Station): boolean => {
        
        // Prepare date calculations
        const endDeStr = data.lastContact.split('.') // e.g. 18.03.2025
        const endDateTsp: number = Date.parse(`${endDeStr[2]}-${endDeStr[1]}-${endDeStr[0]}`) // e.g. 2025-03-18

        return data.name.toLowerCase().indexOf(place.toLowerCase()) >= 0
                && (!isActive || (isActive && endDateTsp + (1000 * 60 * 60 * 24) * 2 > Date.now())) // max. 2 days old and only if isActive flag is true)
    }

    // build a custom parser
    const parser = buildParser(result, filter)

    // fetch (cached) station list html text
    const htmlStr: string = await fetchStationList()

    // Write html to parser
    parser.write(htmlStr)
    parser.end()

    // Mapping: Normalize german date format to ISO format
    result.forEach((station => { station.lastContact = deToIsoDate(station.lastContact); }))

    return result
}, { 
    maxAge: 1000 * 60 * 60 * 24, // data may change once every 24h
    cacheKey: (arguments_) => arguments_[1]+arguments_[0] // simple string concatenation 
 })

/** 
 * Gives stations relevant to place, only active ones, if flag isActive is true
 */
export const stationsByName = async (place: string, isActive: boolean = true): Promise<Station[]> => {
    return memoizedStationsByName(place, isActive) // Memoize previous results for higher speed
}

/**
 * --------------------------------------
 */
const memoizedStationsByLocation = memoize(async (lat: number, lng: number, radius: number): Promise<Station[]> => {

    // collection with results
    const result: Station[] = []

    // Define filter function
    const filter = (data: Station): boolean => {
        
        // Prepare date calculations
        const endDeStr = data.lastContact.split('.') // e.g. 18.03.2025
        const endDateTsp: number = Date.parse(`${endDeStr[2]}-${endDeStr[1]}-${endDeStr[0]}`) // e.g. 2025-03-18

        return haversine([lat, lng], [data.lat, data.lng]) <= radius * 1000 // distance in meters
                && endDateTsp + (1000 * 60 * 60 * 24) * 2 > Date.now() // max. 2 days old and only if isActive flag is true)
    }

    // build a custom parser
    const parser = buildParser(result, filter)

    // fetch (cached) station list html text
    const htmlStr: string = await fetchStationList()

    // Write html to parser
    parser.write(htmlStr)
    parser.end()

    // TODO do some mapping

    return result
}, {
    maxAge: 1000 * 60 * 60 * 24, // data may change once every 24h
    cacheKey: (arguments_) => ""+arguments_[0]+":"+arguments_[1]+":"+arguments_[2]
})

/** Retrieve stations by radius */
export const stationsByLocation = async (lat: number, lng: number, radius: number): Promise<Station[]> => {
    return memoizedStationsByLocation(lat, lng, radius)
}

/**
 * --------------------------------------
 */
const memoizedForecastsByStations = memoize(async (stationCodes: string[]): Promise<ForecastDataRecord> => {

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
                    precipitation: dayForecast.precipitation,
                    icon: dayForecast.icon,
                }
            }),
            // steps: null,
            // warnings: null
        }
    })

    // Return mapped data structure
    return forecastDataRecords
})

/* Retrieve forecast for given stations */
export const forecastsByStations = async (stationCodes: string[]): Promise<ForecastDataRecord> => {
    return memoizedForecastsByStations(stationCodes)
}