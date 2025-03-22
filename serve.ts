import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'

import { stationsByPlace, stationsByLocation } from './src/springs/dwd/adapter'
import { forecast } from './src/springs/dwd/aggregate'

new Elysia()
    .use(swagger())
    .get('/dwd/stations-by-place', ({ query: { place, isActive } }) => {

        // retrieve stations by place name
        return stationsByPlace(place, isActive);

    }, {
        query: t.Object({
            place: t.String(),
            isActive: t.Optional(t.Boolean({default: true})),
        })
    })
    .get('/dwd/stations-by-location', ({ query: { lat, lng, radius, limit } }) => {

        // retrieve stations by geolocation
        return stationsByLocation(lat, lng, radius)
                .then(data => data.slice(0, limit));

    }, {
        query: t.Object({
            lat: t.Number(),
            lng: t.Number(),
            radius: t.Number({default: 10, description: "in km"}), // 10 km
            limit: t.Number({default: 5})
        })
    })
    .get('/dwd/forecast', ({ query: { lat, lng, radius, limit } }) => {

        // retrieve forecasts by place name
        return forecast(lat, lng, radius)
                .then(data => data.slice(0, limit));

    }, {
        query: t.Object({
            lat: t.Number(),
            lng: t.Number(),
            radius: t.Number({default: 10, description: "in km"}), // 10 km
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