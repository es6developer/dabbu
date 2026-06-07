export const CATEGORY_ICONS: Record<string, string> = {
  Food: 'fast-food-outline',
  'Food & Dining': 'fast-food-outline',
  Groceries: 'cart-outline',
  Grocery: 'basket-outline',
  Dining: 'restaurant-outline',
  Travel: 'airplane-outline',
  Transport: 'car-outline',
  Transportation: 'car-outline',
  Gym: 'fitness-outline',
  Fitness: 'fitness-outline',
  Water: 'water-outline',
  Internet: 'wifi-outline',
  Rent: 'home-outline',
  Home: 'home-outline',
  Housing: 'home-outline',
  Bills: 'receipt-outline',
  'Bills & Utilities': 'receipt-outline',
  Electricity: 'flash-outline',
  Gas: 'flame-outline',
  Phone: 'call-outline',
  Shopping: 'bag-outline',
  Entertainment: 'film-outline',
  Medical: 'medkit-outline',
  Health: 'medkit-outline',
  'Health & Medical': 'medkit-outline',
  Education: 'school-outline',
  Fuel: 'flame-outline',
  EMI: 'card-outline',
  Investment: 'trending-up-outline',
  Salary: 'cash-outline',
  Income: 'cash-outline',
  Transfer: 'swap-horizontal-outline',
  Transfers: 'swap-horizontal-outline',
  Subscriptions: 'repeat-outline',
  Subscription: 'repeat-outline',
  Insurance: 'shield-outline',
  Financial: 'shield-outline',
  Refunds: 'return-down-back-outline',
  Pets: 'paw-outline',
  Clothing: 'shirt-outline',
  'Other Income': 'cash-outline',
  'Other Expenses': 'ellipsis-horizontal-outline',
  Other: 'ellipsis-horizontal-outline',
  Uncategorized: 'receipt-outline',
  Utilities: 'flash-outline',
};

export const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  Food: ['#FF6B6B', '#EE5A24'],
  'Food & Dining': ['#FF6B6B', '#EE5A24'],
  Groceries: ['#00B894', '#00A381'],
  Grocery: ['#81ECEC', '#00CEC9'],
  Dining: ['#FDCB6E', '#E17055'],
  Travel: ['#6C5CE7', '#5A4BD1'],
  Transport: ['#74B9FF', '#4D96FF'],
  Transportation: ['#74B9FF', '#4D96FF'],
  Gym: ['#A78BFA', '#8B5CF6'],
  Fitness: ['#A78BFA', '#8B5CF6'],
  Water: ['#38BDF8', '#0984E3'],
  Internet: ['#6C5CE7', '#4A4ABF'],
  Rent: ['#E17055', '#D63031'],
  Home: ['#E17055', '#D63031'],
  Housing: ['#E17055', '#D63031'],
  Bills: ['#F59E0B', '#D68910'],
  'Bills & Utilities': ['#F59E0B', '#D68910'],
  Electricity: ['#FDCB6E', '#F0A830'],
  Gas: ['#FF6B6B', '#EE5A24'],
  Phone: ['#00B894', '#00A381'],
  Shopping: ['#F472B6', '#E056A0'],
  Entertainment: ['#8B5CF6', '#6C3EF4'],
  Medical: ['#FF4D4F', '#CC3B3B'],
  Health: ['#FF4D4F', '#CC3B3B'],
  'Health & Medical': ['#FF4D4F', '#CC3B3B'],
  Education: ['#6366F1', '#4F46E5'],
  Fuel: ['#F59E0B', '#F0A830'],
  EMI: ['#636E72', '#2D3436'],
  Investment: ['#00B894', '#00A381'],
  Salary: ['#00B894', '#00A381'],
  Income: ['#00B894', '#00A381'],
  Transfer: ['#DFE6E9', '#B2BEC3'],
  Transfers: ['#DFE6E9', '#B2BEC3'],
  Subscriptions: ['#6C5CE7', '#5A4BD1'],
  Subscription: ['#6C5CE7', '#5A4BD1'],
  Insurance: ['#00CEC9', '#00B894'],
  Financial: ['#00CEC9', '#00B894'],
  Refunds: ['#00B894', '#00A381'],
  Pets: ['#FDCB6E', '#F0A830'],
  Clothing: ['#F472B6', '#E056A0'],
  'Other Income': ['#00B894', '#00A381'],
  'Other Expenses': ['#636E72', '#2D3436'],
  Other: ['#636E72', '#2D3436'],
  Uncategorized: ['#636E72', '#2D3436'],
  Utilities: ['#FDCB6E', '#F0A830'],
};

export function getCategoryIcon(cat: string | null | undefined, defaultIcon: string = 'receipt-outline'): string {
  if (!cat) return defaultIcon;
  const key = Object.keys(CATEGORY_ICONS).find(
    (k) => k.toLowerCase().trim() === cat.toLowerCase().trim(),
  );
  return key ? CATEGORY_ICONS[key] : defaultIcon;
}

export function getCategoryGradient(
  cat: string | null | undefined,
  defaultGradient: [string, string] = ['#6C3EF4', '#8B5CF6'],
): [string, string] {
  if (!cat) return defaultGradient;
  const key = Object.keys(CATEGORY_GRADIENTS).find(
    (k) => k.toLowerCase().trim() === cat.toLowerCase().trim(),
  );
  return key ? CATEGORY_GRADIENTS[key] : defaultGradient;
}

export function getCategoryColor(cat: string | null | undefined, defaultColor: string = '#6C3EF4'): string {
  return getCategoryGradient(cat, [defaultColor, defaultColor])[0];
}
