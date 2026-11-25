export class NovaPoshtaRepository {
  constructor(private readonly apiKey: string) {}

  private async request(modelName: string, calledMethod: string, methodProperties: object) {
    try {
      const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          modelName,
          calledMethod,
          methodProperties,
        }),
      })

      if (!response.ok) throw new Error('Nova Poshta API request failed')

      return await response.json()
    } catch {
      throw new Error('Nova Poshta API request failed')
    }
  }

  async findCities(query: string) {
    return this.request('AddressGeneral', 'searchSettlements', {
      CityName: query,
      Limit: 20,
      Page: 1,
    })
  }

  async findWarehouses(cityRef: string, _query?: string) {
    return this.request('AddressGeneral', 'getWarehouses', {
      CityRef: cityRef,
      // FindByString: query,
    })
  }
}
