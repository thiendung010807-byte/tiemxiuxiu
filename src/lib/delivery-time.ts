// Used by the admin API and UI to prioritize the earliest customer-requested handover.
export function requestedDeliveryTime(order: Record<string, unknown>): number {
  const times: number[] = [];
  for (const value of [order.customer_time, order.recipient_time]) {
    if (typeof value === 'string' && value.trim()) {
      const time = Date.parse(value);
      if (Number.isFinite(time)) times.push(time);
    }
  }
  if (typeof order.cards_json === 'string') {
    try {
      const cards: unknown = JSON.parse(order.cards_json);
      if (Array.isArray(cards)) for (const card of cards) {
        if (card && typeof card === 'object' && typeof card.deliveryTime === 'string') {
          const time = Date.parse(card.deliveryTime);
          if (Number.isFinite(time)) times.push(time);
        }
      }
    } catch { /* Legacy orders may have no cards */ }
  }
  return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
}
