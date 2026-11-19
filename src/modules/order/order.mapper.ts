import { PaymentMethod } from '../../generated/prisma/client';
import { CreateOrderInput } from './order.types';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  if (
    value != null &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return Number(value);
}

export function mapPaymentMethod(
  method: CreateOrderInput['payment']['method']
): PaymentMethod {
  if (method === 'cash_on_delivery') {
    return PaymentMethod.Cash;
  }

  if (method === 'card') {
    return PaymentMethod.Card;
  }

  return PaymentMethod.PayPal;
}

export function buildShippingAddress(
  contact: CreateOrderInput['contact'],
  delivery: CreateOrderInput['delivery']
) {
  const base = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    country: 'UA',
    postalCode: null as string | null,
  };

  if (delivery.method === 'courier') {
    return {
      ...base,
      city: delivery.city?.name || delivery.city?.shortName || '—',
      addressLine1: delivery.address,
      addressLine2: null as string | null,
    };
  }

  const cityName =
    delivery.city.name || delivery.city.shortName || delivery.city.ref;
  const addressLine1 =
    delivery.warehouse.shortAddress || delivery.warehouse.name;
  const addressLine2 = [
    delivery.method === 'np_postomat'
      ? 'Nova Poshta postomat'
      : 'Nova Poshta warehouse',
    delivery.warehouse.number ? `#${delivery.warehouse.number}` : null,
    delivery.warehouse.ref,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ...base,
    city: cityName,
    addressLine1,
    addressLine2,
  };
}

type DecimalLike = { toNumber?: () => number } | number | string | null;

type OrderRecord = {
  id: string;
  userId: string;
  orderNumber: string;
  status: string;
  email: string;
  phone: string | null;
  subtotalAmount: DecimalLike;
  shippingAmount: DecimalLike;
  discountAmount: DecimalLike;
  totalAmount: DecimalLike;
  notes: string | null;
  currency: string;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    productSlug: string;
    imageUrl: string | null;
    category: string;
    unitPrice: DecimalLike;
    discountPercent: DecimalLike;
    quantity: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string | null;
    country: string;
    city: string;
    postalCode: string | null;
    addressLine1: string;
    addressLine2: string | null;
  } | null;
  payment: {
    amount: DecimalLike;
    method: string;
    status: string;
    transactionId: string | null;
    provider: string | null;
    paidAt: Date | null;
  } | null;
};

export function serializeOrder(order: OrderRecord) {
  return {
    id: order.id,
    userId: order.userId,
    orderNumber: order.orderNumber,
    status: order.status,
    email: order.email,
    phone: order.phone,
    subtotalAmount: decimalToNumber(order.subtotalAmount),
    shippingAmount: decimalToNumber(order.shippingAmount),
    discountAmount: decimalToNumber(order.discountAmount),
    totalAmount: decimalToNumber(order.totalAmount),
    notes: order.notes,
    currency: order.currency,
    placedAt: order.placedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      imageUrl: item.imageUrl,
      category: item.category,
      unitPrice: decimalToNumber(item.unitPrice),
      discountPercent: decimalToNumber(item.discountPercent),
      quantity: item.quantity,
    })),
    shippingAddress: order.shippingAddress,
    payment: order.payment
      ? {
          amount: decimalToNumber(order.payment.amount),
          method: order.payment.method,
          status: order.payment.status,
          transactionId: order.payment.transactionId,
          provider: order.payment.provider,
          paidAt: order.payment.paidAt,
        }
      : null,
  };
}
