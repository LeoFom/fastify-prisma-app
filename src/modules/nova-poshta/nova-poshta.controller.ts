import { FastifyRequest, FastifyReply } from 'fastify';
import { NovaPoshtaService } from './nova-poshta.service';
import {getCitiesSchema, getSettlementsSchema, getWarehousesSchema} from './nova-poshta.schema';
import {z, ZodError} from "zod";
import {GetCitiesQuery, GetWarehousesQuery} from "./nova-poshta.types";

export class NovaPoshtaController {
  constructor(
    private readonly service: NovaPoshtaService,
  ) {}

  getCities = async (
    req: FastifyRequest<{
      Querystring: GetCitiesQuery;
    }>,
    res: FastifyReply,
  ) => {
    const query = getCitiesSchema.parse(req.query);

    return this.service.getCities(query.query);
  };

  getSettlements = async (
    req: FastifyRequest<{
      Querystring: GetCitiesQuery;
    }>,
    res: FastifyReply,
  ) => {
    const query = getSettlementsSchema.parse(req.query);

    return this.service.getCities(query.query);
  };

  getWarehouses = async (
    req: FastifyRequest<{
      Querystring: GetWarehousesQuery;
    }>,
    res: FastifyReply,
  ) => {
    const query = getWarehousesSchema.parse(req.query);

    return this.service.getWarehouses(
      query.cityRef,
      query.query,
    );
  };
}