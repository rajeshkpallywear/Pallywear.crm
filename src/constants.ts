/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CATEGORIES = [
  'Sweatshirt',
  'Pant',
  'T-Shirt',
  'Oversized',
  'Jersey',
  'Shirt',
  'Hoodie',
  'Corporate Gift',
  'Pen',
  'Mug',
  'Dairy',
  'Cap',
  'Bag',
  'Bottle'
];

export const JERSEY_MATERIALS = ['Dot Knit 170', 'Dot Knit 190', 'Excel Selina'];
export const JERSEY_MODELS = ['Polo', 'Crewneck', 'V-Neck', 'Shorts', 'Track Pant'];
export const JERSEY_SLEEVES = ['pull', 'half'];

export const SLEEVE_OPTIONS = ['full', 'half'];
export const POCKET_OPTIONS = ['yes', 'no'];

export const SHIRT_MATERIALS = ['Magic Lovely'];
export const SHIRT_MODELS = ['Polo', 'Mandarin Collar'];
export const SHIRT_COLOURS = ['Industrial Blue', 'Grey', 'Pink', 'White', 'Black', 'other'];

export const PRINT_TYPES = ['DTF', 'Embroidery', 'Screen Printing'];

export const HOODIE_MODELS = ['Zipper', 'Non Zipper'];
export const HOODIE_COLOURS = ['Black', 'Grey Melange', 'Navy'];

export const SWEATSHIRT_COLOURS = ['Black', 'Grey Melange', 'Navy'];

export const PANT_MATERIALS = ['sangam'];
export const PANT_COLOURS = ['Navy', 'Black', 'other'];

export const TSHIRT_MATERIALS = ['Everyday', 'Blended', 'Comfort', 'Feathery', 'Economy', 'Affordable', 'Cotton-180'];
export const TSHIRT_COLOURS_MAP: Record<string, string[]> = {
  'Everyday': ['Black', 'White', 'heather Rose', 'pine green', 'Wood Orange', 'Arrow Red', 'Navy', 'Rama Blue', 'Charcoal', 'Sunshine Yellow', 'Banana Yellow'],
  'Blended': ['Black', 'Navy', 'Maroon', 'Dark Green', 'Sky Blue', 'Royal Blue'],
  'Comfort': ['Black', 'Navy', 'White', 'Sky Blue', 'Royal Bule', 'Pista Green', 'Dark Green', 'Light Green', 'Maroon', 'Red', 'Lilac', 'Gray Melange'],
  'Feathery': ['Black', 'Navy', 'White', 'Sky Blue', 'Royal Bule', 'Pista Green', 'Dark Green', 'Light Green', 'Maroon', 'Red', 'Lilac', 'Gray Melange'],
  'Economy': ['Black', 'Navy', 'White', 'pine Green', 'Woody Orange', 'Arrow Red', 'Rama Blue', 'Charcoal', 'Sunshine Yellow', 'Banana Yellow'],
  'Affordable': ['Black', 'Navy', 'White', 'Green', 'Red', 'Light Yellow', 'yellow', 'Royal Bule', 'Orange', 'Sky Bule', 'Maroon'],
  'Cotton-180': ['Black', 'White']
};

export const OVERSIZED_MATERIALS = ['Terry'];
export const OVERSIZED_COLOURS = ['Black', 'White'];

export const CORPORATE_GIFT_OPTIONS = ['7 in 1', '6 in 1', '5 in 1', '4 in 1', '3 in 1', '2 in 1'];

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
