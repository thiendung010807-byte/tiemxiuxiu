export const PRODUCTS = [
  {
    id: "hoa-xinh", name: "Hoa xinh + thiệp bé ngoan",
    desc: "Bó hoa mini len và một chiếc thiệp xinh xắn.", price: 15000, color: "bg-pinky",
    images: ["/images/hoa.png"],
    details: "Chi tiết: 1 đóa hoa len siêu xinh xắn. 1 chiếc thiệp nhỏ nhắn viết tay."
  },
  {
    id: "hop-qua", name: "Hộp quà + hoa bất ngờ",
    desc: "Hộp quà bí mật gồm hoa, kẹo ngọt.", price: 35000, color: "bg-yellows",
    images: ["/images/qua.png"],
    details: "Chi tiết: 1 hộp quà thắt nơ xinh xắn. Bên trong có hoa len, kẹo dâu tây."
  }
];

/** Automatic 30,000 VND voucher for orders with at least 30 products. */
export const VOUCHER_THRESHOLD = 30;
export const VOUCHER_AMOUNT = 30000;
export const calculateVoucher = (quantity: number) => quantity >= VOUCHER_THRESHOLD ? VOUCHER_AMOUNT : 0;

/** Every handwritten card costs 3,000 VND; shipping is always free. */
export const calculateTotal = (items: { id: string; quantity: number }[], cardCount = 0) => {
  const subtotal = items.reduce((total, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return total + (product?.price || 0) * item.quantity;
  }, 0);
  const gift_service_fee = Math.max(0, cardCount) * 3000;
  const discount = calculateVoucher(items.reduce((sum, item) => sum + item.quantity, 0));
  return { subtotal, gift_service_fee, delivery_fee: 0, discount, total: Math.max(0, subtotal + gift_service_fee - discount) };
};
