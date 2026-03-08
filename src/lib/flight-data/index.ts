import { FlightAwareProvider } from './flightaware'
import { OpenSkyProvider } from './opensky'

const flightAware = new FlightAwareProvider()
const openSky = new OpenSkyProvider()

export { flightAware, openSky }
export * from './types'
export { fetchFAADelays } from './faa'
