import * as htmlparser2 from "htmlparser2"
import { decode } from "html-entities"
import memoize from "memoize"

import { fetchStationList } from "./port"


export interface Station {
    name: string,
    id: string,
    code: string,
    lat: number,
    lng: number,
    altitude: number,
    end: string // e.g. 18.03.2025
}

const buildParser = (result: Station[], place: string, isActive: boolean) => {

    // Initialize default
    let cursor: {
        row: number,
        column: number,
    } = {
        row: 1,
        column: 0 // Start unknown column
    }

    const defaults: Station = {name: '', id: '', code: '', lat: 0.0, lng: 0.0, altitude: 0, end: ''}
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
            if (cursor.column === 11) { data.end = text.trim(); return; }
        },
        onclosetag(tagname) {

            if (tagname === "tr") {
            
                // Prepare date calculations
                const endDeStr = data.end.split('.') // e.g. 18.03.2025
                const endDateTsp: number = Date.parse(`${endDeStr[2]}-${endDeStr[1]}-${endDeStr[0]}`) // e.g. 2025-03-18

                // Check criterias station name and activeness etc.
                if (
                    data.name.toLowerCase().indexOf(place.toLowerCase()) >= 0
                    && (!isActive || (isActive && endDateTsp + (1000 * 60 * 60 * 24) * 2 > Date.now())) // max. 2 days old and only if isActive flag is true
                ) {
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
 * Memoize stations function 
 */
const memoizedStationsByPlace = memoize(async (place: string, isActive: boolean) => {

    // collection with results
    const result: Station[] = []

    // build a custom parser
    const parser = buildParser(result, place, isActive)

    // fetch (cached) station list html text
    const htmlStr: string = await fetchStationList()

    // Write html to parser
    parser.write(htmlStr)
    parser.end()

    return result
}, { 
    maxAge: 1000 * 60 * 60 * 24, // data may change once every 24h
    cacheKey: (arguments_) => arguments_[0]+":"+arguments_[1] // simple string concatenation 
 }) // cache results for 24 hour)

/** 
 * Gives stations relevant to place, only active ones, if flag isActive is true
 */
export const stationsByPlace = async (place: string, isActive: boolean = true): Promise<Station[]> => {

    // Memoize previous results for higher speed
    return memoizedStationsByPlace(place, isActive);
}