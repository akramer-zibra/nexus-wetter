import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

import { 
    stationsByName, 
    stationsByLocationWithDistance,
    forecast 
} from './src/springs/dwd'

new Elysia()
    .use(swagger())
    .get('/dwd/stations-by-place', ({ query: { place, recency } }) => {

        // retrieve stations by place name
        return stationsByName(place, recency);

    }, {
        query: t.Object({
            place: t.String(),
            recency: t.Optional(t.Number({description: "Letzte Messung nicht älter als <recency> Tage"}))
        })
    })
    .get('/dwd/stations-by-location', ({ query: { lat, lng, range, recency, limit } }) => {

        // retrieve stations by geolocation
        return stationsByLocationWithDistance(lat, lng, range, recency)
                .then(data => data.slice(0, limit));

    }, {
        query: t.Object({
            lat: t.Number(),
            lng: t.Number(),
            range: t.Number({default: 10, description: "in km"}), // 10 km
            recency: t.Optional(t.Number({description: "Letzte Messung nicht älter als <recency> Tage"})),
            limit: t.Number({default: 5})
        })
    })
    .get('/dwd/forecast-by-location', ({ query: { lat, lng, range, limit } }) => {

        // retrieve forecasts by place name
        return forecast(lat, lng, range)
                .then(data => data.slice(0, limit));

    }, {
        query: t.Object({
            lat: t.Number(),
            lng: t.Number(),
            range: t.Number({default: 10, description: "in km"}), // 10 km
            limit: t.Number({default: 5})
        })
    })
    .listen(3000)

// 
console.log("[Nexus] Webservice running on port 3000...")

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("[Nexus] Webservice shutdown.")
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log("[Nexus] Webservice shutdown.")
    process.exit(0)
})