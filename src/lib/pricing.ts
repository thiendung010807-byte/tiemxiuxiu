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

/** Every handwritten card costs 3,000 VND; shipping is always free. */
export const calculateTotal = (items: { id: string; quantity: number }[], cardCount = 0) => {
  const subtotal = items.reduce((total, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return total + (product?.price || 0) * item.quantity;
  }, 0);
  const gift_service_fee = Math.max(0, cardCount) * 3000;
  return { subtotal, gift_service_fee, delivery_fee: 0, total: subtotal + gift_service_fee };
};
