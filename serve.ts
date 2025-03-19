import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { stationsByPlace } from './src/springs/dwd/adapter'

new Elysia()
    .use(swagger())
    .get('/dwd/stations', ({ query: { place, isActive } }) => {

        // retrieve statetions by place name
        return stationsByPlace(place, isActive);

    }, {
        query: t.Object({
            place: t.String(),
            isActive: t.Optional(t.Boolean({default: true})),
        })
    })
    .get('dwd/forecast', ({ query: { place } }) => {
        
        throw new Error("Not implemented yet")

    }, {
        query: t.Object({
            place: t.String(),
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