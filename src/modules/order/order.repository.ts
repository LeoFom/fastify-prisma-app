import { randomBytes } from 'node:crypto';
import { PrismaClient } from '../../generated/prisma/client';
import { CreateOrderInput, OrderHttpError } from './order.types';
import {
  buildShippingAddress,
  decimalToNumber,
  mapPaymentMethod,
  roundMoney,
  serializeOrder,
} from './order.mapper';

const orderInclude = {
  items: true,
  shippingAddress: true,
  payment: true,
} as const;

function generateOrderNumber() {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `CF-${stamp}-${rand}`;
}

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findManyByUserId(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { placedAt: 'desc' },
    });

    return orders.map(serializeOrder);
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  async createFromCart(
    userId: string,
    userEmail: string,
    input: CreateOrderInput
  ) {
    return this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: { product: true },
      });

      if (cartItems.length === 0) {
        throw new OrderHttpError(400, 'Cart is empty');
      }

      let subtotalAmount = 0;
      let discountAmount = 0;

      const orderItems = cartItems.map((item) => {
        if (!item.product) {
          throw new OrderHttpError(400, 'Cart contains unavailable products');
        }

        const unitPrice = roundMoney(decimalToNumber(item.product.price));
        const discountPercent = roundMoney(
          decimalToNumber(item.product.memberDiscountPercent)
        );
        const lineGross = roundMoney(unitPrice * item.quantity);
        const lineDiscount = roundMoney(lineGross * (discountPercent / 100));

        subtotalAmount = roundMoney(subtotalAmount + lineGross);
        discountAmount = roundMoney(discountAmount + lineDiscount);

        return {
          productId: item.productId,
          productName: item.product.name,
          productSlug: item.product.slug,
          imageUrl: item.product.imageUrl,
          category: item.product.category,
          unitPrice,
          discountPercent,
          quantity: item.quantity,
        };
      });

      const shippingAmount = 0;
      const totalAmount = roundMoney(
        subtotalAmount + shippingAmount - discountAmount
      );
      const email = input.contact.email || userEmail;
      const shipping = buildShippingAddress(input.contact, input.delivery);

      const order = await tx.order.create({
        data: {
          userId,
          orderNumber: generateOrderNumber(),
          email,
          phone: input.contact.phone,
          notes: input.comment || null,
          subtotalAmount,
          shippingAmount,
          discountAmount,
          totalAmount,
          currency: cartItems[0]?.currency || 'USD',
          items: {
            create: orderItems,
          },
          shippingAddress: {
            create: shipping,
          },
          payment: {
            create: {
              amount: totalAmount,
              method: mapPaymentMethod(input.payment.method),
              status: 'Pending',
            },
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return serializeOrder(order);
    });
  }
}
