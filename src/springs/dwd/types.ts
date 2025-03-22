export interface Station {
    name: string,
    id: string,
    code: string,
    lat: number,
    lng: number,
    altitude: number,
    end: string // e.g. 18.03.2025 // TODO rename to eol or activeness or last contact
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