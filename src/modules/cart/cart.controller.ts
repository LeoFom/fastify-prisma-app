import {FastifyReply, FastifyRequest} from 'fastify';
import {CartService} from './cart.service';
import {createCartsSchema, updateCartsSchema} from './cart.schema';
import {z, ZodError} from "zod";
import '@fastify/cookie';

export class CartController {
  constructor(private readonly service: CartService) {}

  private UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  getAll = async (req: FastifyRequest, res: FastifyReply) => {
    const userId = req.cookies?.userId ?? ''

    // return res.status(200).send({
    //   success: true,
    //   cartItems: [] // Тут буде твоя логіка з БД
    // });
    if(userId === ''){
      return res.status(404).send(
        {

          success: false,
          text: `ERROR - userId is empty`,
        }
      )
    }

    if (!this.UUID_REGEX.test(userId)) {
      return res.status(400).send({
        success: false,
        text: `ERROR - Invalid userId format. Expected UUID, got "${userId}"`,
      });
    }

    try {
      return await this.service.getAll(userId);
    } catch (error) {
      req.log.error(error);
      return res.status(500).send({
        success: false,
        text: "Internal server error during fetching cart items",
      });
    }
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    return this.service.getById(req.params.id);
  };

  create = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const data = createCartsSchema.parse(req.body);

      const product = await this.service.create(data);

      return res.status(201).send(product);
    } catch (error) {
      console.dir(error, { depth: null });

      if (error instanceof ZodError) {
        return res.status(400).send({
          message: "Validation failed",
          errors: z.treeifyError(error),
        });
      }

      req.log.error(`(create products) ERROR LOG: ${error}`);

      return res.status(500).send({
        message: "Internal server error",
      });
    }
  };

  update = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    const data = updateCartsSchema.parse(req.body);
    return this.service.update(req.params.id, data);
  };

  delete = async (req: FastifyRequest<{ Params: { id: string } }>, res: FastifyReply) => {
    return this.service.delete(req.params.id);
  };
}