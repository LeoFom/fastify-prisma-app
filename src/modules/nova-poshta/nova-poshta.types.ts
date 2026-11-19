export interface GetCitiesQuery {
  query: string;
}

export interface GetWarehousesQuery {
  cityRef: string;
  query?: string;
}

export interface NPCity {
  AddressDeliveryAllowed: boolean;
  Area: string;
  DeliveryCity: string;
  MainDescription: string;
  ParentRegionCode: string;
  ParentRegionTypes: string;
  Present: string;
  Ref: string;
  Region: string;
  RegionTypes: string;
  RegionTypesCode: string;
  SettlementTypeCode: string;
  StreetsAvailability: boolean;
  Warehouses: number;
}

export interface NPCityResponse {
  Addresses: NPCity[];
}