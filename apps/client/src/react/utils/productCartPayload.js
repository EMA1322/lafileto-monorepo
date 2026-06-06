export function buildProductCartPayload(product, quantity = 1) {
  const safeQuantity = Math.min(99, Math.max(1, Math.trunc(Number(quantity) || 1)));

  return {
    id: String(product?.id ?? ''),
    name: product?.name || 'Producto',
    price: Number(product?.finalPrice || 0),
    image: product?.imageUrl || '/img/hero1.png',
    source: product?.source || 'products',
    quantity: safeQuantity,
  };
}
