import type { OrderTab } from '@/lib/sheets';

/** Phân loại theo đích nhận của từng thiệp, không phải chỉ theo việc có thiệp. */
export function getOrderTab(order: { cards?: unknown; gift_option?: unknown }): OrderTab {
  if (Array.isArray(order.cards) && order.cards.length > 0) {
    const needsDelivery = order.cards.some((card: unknown) => {
      if (!card || typeof card !== 'object') return true;
      const entry = card as Record<string, unknown>;
      if (typeof entry.deliveryToCustomer === 'boolean') return !entry.deliveryToCustomer;
      return entry.deliveryMode !== 'customer';
    });
    return needsDelivery ? 'Người giao hộ' : 'Người tự nhận';
  }
  return order.gift_option === 'shop' ? 'Người giao hộ' : 'Người tự nhận';
}
