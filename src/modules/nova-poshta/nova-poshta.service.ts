import { NovaPoshtaRepository } from './nova-poshta.repository'

export class NovaPoshtaService {
  constructor(private readonly repository: NovaPoshtaRepository) {}

  async getCities(query: string) {
    const response = await this.repository.findCities(query)

    const cities = response.data?.[0]?.Addresses ?? []

    return cities
    //   .map((city: NPCity) => ({
    //   ref: city.Ref,
    //   label: city.Present,
    //   sublabel: city.Area,
    // }));
  }

  async getWarehouses(cityRef: string, query?: string) {
    const response = await this.repository.findWarehouses(cityRef, query)

    const data = response.data
    return data
  }
}
