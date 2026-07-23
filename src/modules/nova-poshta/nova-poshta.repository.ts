import { Prisma, PrismaClient} from '../../generated/prisma/client';

export class NovaPoshtaRepository {
  constructor(
    private readonly apiKey: string,
  ) {}

  private async request(
    modelName: string,
    calledMethod: string,
    methodProperties: object,
  ) {
    const response = await fetch(
      'https://api.novaposhta.ua/v2.0/json/',
      {
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
      },
    );

    if (!response.ok) {
      throw new Error('Nova Poshta API request failed');
    }

    return response.json();
  }

  async findCities(query: string) {
    return this.request(
      'Address',
      'searchSettlements',
      {
        CityName: query,
        Limit: 20,
      },
    );
  }

  async findWarehouses(
    cityRef: string,
    query?: string,
  ) {
    return this.request(
      'AddressGeneral',
      'getWarehouses',
      {
        CityRef: cityRef,
        FindByString: query,
      },
    );
  }
}