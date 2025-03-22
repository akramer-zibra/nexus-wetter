export interface Station {
    name: string,
    id: string,
    code: string,
    lat: number,
    lng: number,
    altitude: number,
    lastContact: string // e.g. 18.03.2025
}

export interface StationWithDistance {
    point: {
        lat: number,
        lng: number
    },
    distance: number,
    station: Station
}

export interface Forecast {
    station: Station,
    forecast: ForecastData
}

export interface ForecastData {
    days: {
        date: string,
        temperatureMin: number,
        temperatureMax: number,
        precipitation: number,
        icon: number,
    }[],
    // steps: [],
    // warnings: any[]
}

export interface ForecastDataRecord {
    [stationCode: string]: ForecastData
}