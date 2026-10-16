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

export const calculateTotal = (items: { id: string; quantity: number }[], giftOption: "self" | "shop") => {
  let subtotal = 0;
  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (product) subtotal += product.price * item.quantity;
  }
  const gift_service_fee = giftOption === "shop" ? 3000 : 0;
  return { subtotal, gift_service_fee, delivery_fee: 0, total: subtotal + gift_service_fee };
};
