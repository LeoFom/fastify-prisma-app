import { NovaPoshtaRepository } from './nova-poshta.repository';

export class NovaPoshtaService {
  constructor(
    private readonly repository: NovaPoshtaRepository,
  ) {}

  async getCities(query: string) {
    const response =
      await this.repository.findCities(query);

    return response.data;
  }

  async getWarehouses(
    cityRef: string,
    query?: string,
  ) {
    const response =
      await this.repository.findWarehouses(
        cityRef,
        query,
      );

    return response.data;
  }
}