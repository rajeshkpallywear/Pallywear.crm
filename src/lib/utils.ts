import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayCategory(order: { category?: string; sizeBreakdown?: { category: string }[] }) {
  if (order.sizeBreakdown && order.sizeBreakdown.length > 0) {
    const categories = Array.from(new Set(order.sizeBreakdown.map(i => i.category)));
    if (categories.length === 1) return categories[0];
    return 'Mixed Order';
  }
  return order.category || 'General';
}

export function calculateOrderSize(order: any): number {
  try {
    // Stringify gives a rough estimate of the document size in bytes
    // Firestore limit is 1,048,576 bytes.
    return encodeURI(JSON.stringify(order)).split(/%..|./).length - 1;
  } catch (e) {
    return 0;
  }
}

export function isOrderSizeValid(order: any, extraSize: number = 0): boolean {
  const currentSize = calculateOrderSize(order);
  const totalSize = currentSize + extraSize;
  const limit = 1000000; // 1MB Firestore limit

  if (totalSize > limit) {
    console.warn(`Order size validation failed: ${(totalSize / 1024).toFixed(0)}KB exceeds ${limit / 1024}KB limit`);
  }

  return totalSize < limit;
}
