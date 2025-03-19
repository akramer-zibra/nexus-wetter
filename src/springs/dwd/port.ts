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
            // responseType: 'arraybuffer',
            cache: {
                ttl: 1000 * 60 * 60 * 24 // 24h . This data refreshes every 24h 
            }
        })
    // });
    
    // const decoder = new TextDecoder('UTF-8');
    // let htmlStr = decoder.decode(res.data)

    return res.data
}

/** Retrievs forecast data by station codes */
export const fetchStationForecast = (codes: string[]) => {

//   curl -X 'GET' \
//   'https://dwd.api.proxy.bund.dev/v30/stationOverviewExtended?stationIds=10739' \
//   -H 'accept: application/json'
}