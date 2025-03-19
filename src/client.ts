import Axios, { type AxiosInstance } from 'axios';
import { setupCache } from 'axios-cache-interceptor';
import type { AxiosCacheInstance } from 'axios-cache-interceptor';

// Singleton instance of axios client
let axios: AxiosCacheInstance|undefined = undefined;

/** Build method for aios client */
const client = (): AxiosCacheInstance => {

    if (!axios) {
        // Build instance with cache interceptor
        const instance = Axios.create(); 
        axios = setupCache(instance); // MemoryStorage is default
    }

    return axios;
} 

export default client;