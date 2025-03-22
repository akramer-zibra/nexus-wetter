import client from '../../client'

/** Retrieves a html list of all available dwd stations */
export const fetchStationList = async () => {

    // Fetch html from dwd website 
    const res = await client().get(
        'https://www.dwd.de/DE/leistungen/klimadatendeutschland/statliste/statlex_html.html?view=nasPublication&nn=16102',
        {
            headers: {
                'Accept-Charset': 'utf-8',
            },
            responseType: 'text',
            cache: {
                ttl: 1000 * 60 * 60 * 24 // 24h . This data refreshes every 24h 
            }
        })
    
    return res.data
}

/** Retrievs forecast data by station codes */
export const fetchStationForecasts = async (codes: string[]): Promise<any[]> => {

    // 
    const ids = codes.join(',')

    // Fetch json from dwd website 
    const res = await client().get(
        'https://dwd.api.proxy.bund.dev/v30/stationOverviewExtended?stationIds='+ids,
        {
            headers: {
                'accept': 'applicatio/json',
            },
            cache: {
                ttl: 1000 * 60 * 60 * 0.5 // 3h . This data refreshes every 3h, so we use a shorter TTL here
            }
        })

    return res.data
//   curl -X 'GET' \
//   'https://dwd.api.proxy.bund.dev/v30/stationOverviewExtended?stationIds=10739' \
//   -H 'accept: application/json'
}