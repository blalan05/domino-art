export interface DefaultPaletteColor {
  name: string;
  hex: string;
  code: string | null;
  quantityOwned: number;
  sortOrder: number;
}

/** Default domino palette extracted from Domino Art Planner workbook. */
export const DEFAULT_PALETTE: DefaultPaletteColor[] = [
  { name: 'Black', hex: '#1A1A1A', code: null, quantityOwned: 0, sortOrder: 1 },
  { name: 'Blue', hex: '#3399FF', code: null, quantityOwned: 0, sortOrder: 2 },
  { name: 'Brown', hex: '#993300', code: null, quantityOwned: 0, sortOrder: 3 },
  { name: 'Bubblegum Pink', hex: '#FF99CC', code: null, quantityOwned: 0, sortOrder: 4 },
  { name: 'Caramel', hex: '#CC9900', code: null, quantityOwned: 0, sortOrder: 5 },
  { name: 'Clear', hex: '#E8F4F8', code: 'C', quantityOwned: 0, sortOrder: 6 },
  { name: 'Clear Blue', hex: '#3399FF', code: 'C', quantityOwned: 0, sortOrder: 7 },
  { name: 'Clear Green Emerald', hex: '#33CC33', code: 'C', quantityOwned: 0, sortOrder: 8 },
  { name: 'Clear Neon Pink', hex: '#FF6699', code: 'CN', quantityOwned: 0, sortOrder: 9 },
  { name: 'Clear Neon Yellow', hex: '#FFFF00', code: 'CN', quantityOwned: 0, sortOrder: 10 },
  { name: 'Clear Red', hex: '#FF0000', code: 'C', quantityOwned: 0, sortOrder: 11 },
  { name: 'Clear Royal Blue', hex: '#3366FF', code: 'C', quantityOwned: 0, sortOrder: 12 },
  { name: 'Clear Yellow', hex: '#FFFF00', code: 'C', quantityOwned: 0, sortOrder: 13 },
  { name: 'Corn Yellow', hex: '#FFCC00', code: 'CN', quantityOwned: 0, sortOrder: 14 },
  { name: 'Dark Blue', hex: '#333399', code: null, quantityOwned: 0, sortOrder: 15 },
  { name: 'Dark Grey', hex: '#777777', code: null, quantityOwned: 0, sortOrder: 16 },
  { name: 'Fuchsia', hex: '#FF3399', code: null, quantityOwned: 0, sortOrder: 17 },
  { name: 'Gold', hex: '#FFCC00', code: null, quantityOwned: 0, sortOrder: 18 },
  { name: 'Green', hex: '#008000', code: null, quantityOwned: 0, sortOrder: 19 },
  { name: 'Grey', hex: '#B2B2B2', code: null, quantityOwned: 0, sortOrder: 20 },
  { name: 'Hunter Green', hex: '#006600', code: null, quantityOwned: 0, sortOrder: 21 },
  { name: 'Ice', hex: '#CCFFFF', code: null, quantityOwned: 0, sortOrder: 22 },
  { name: 'Ivory', hex: '#FFEFD9', code: null, quantityOwned: 0, sortOrder: 23 },
  { name: 'Kiwi', hex: '#33CC33', code: null, quantityOwned: 0, sortOrder: 24 },
  { name: 'Lavender', hex: '#CC66FF', code: null, quantityOwned: 0, sortOrder: 25 },
  { name: 'Light Orange', hex: '#FFCC66', code: null, quantityOwned: 0, sortOrder: 26 },
  { name: 'Light Pink', hex: '#FFCCCC', code: null, quantityOwned: 0, sortOrder: 27 },
  { name: 'Lilac', hex: '#FFCCFF', code: null, quantityOwned: 0, sortOrder: 28 },
  { name: 'Maroon', hex: '#CC0000', code: null, quantityOwned: 0, sortOrder: 29 },
  { name: 'Navy Blue', hex: '#000066', code: null, quantityOwned: 0, sortOrder: 30 },
  { name: 'Neon Green', hex: '#00FF00', code: 'N', quantityOwned: 0, sortOrder: 31 },
  { name: 'Neon Orange', hex: '#FF9933', code: 'N', quantityOwned: 0, sortOrder: 32 },
  { name: 'Neon Pink', hex: '#FF3399', code: 'N', quantityOwned: 0, sortOrder: 33 },
  { name: 'Neon Yellow', hex: '#FFFF00', code: 'N', quantityOwned: 0, sortOrder: 34 },
  { name: 'Olive Drab', hex: '#808000', code: null, quantityOwned: 0, sortOrder: 35 },
  { name: 'Orange', hex: '#FF9933', code: null, quantityOwned: 0, sortOrder: 36 },
  { name: 'Purple', hex: '#9900FF', code: null, quantityOwned: 0, sortOrder: 37 },
  { name: 'Raspberry', hex: '#FF66FF', code: null, quantityOwned: 0, sortOrder: 38 },
  { name: 'Red', hex: '#FF0000', code: null, quantityOwned: 0, sortOrder: 39 },
  { name: 'Sky Blue', hex: '#CCECFF', code: null, quantityOwned: 0, sortOrder: 40 },
  { name: 'Sour Apple Green', hex: '#99FF33', code: null, quantityOwned: 0, sortOrder: 41 },
  { name: 'Teal', hex: '#66FFCC', code: null, quantityOwned: 0, sortOrder: 42 },
  { name: 'Teal Blue', hex: '#009999', code: null, quantityOwned: 0, sortOrder: 43 },
  { name: 'White', hex: '#FFFFFF', code: null, quantityOwned: 0, sortOrder: 44 },
  { name: 'Yellow', hex: '#FFFF00', code: null, quantityOwned: 0, sortOrder: 45 },
];

export function createDemoPaletteColors(): Array<DefaultPaletteColor & { id: string }> {
  return DEFAULT_PALETTE.map((color, index) => ({
    ...color,
    id: `demo-${index + 1}`,
  }));
}
