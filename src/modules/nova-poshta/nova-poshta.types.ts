export interface GetCitiesQuery {
  query: string;
}

export interface GetWarehousesQuery {
  cityRef: string;
  query?: string;
}