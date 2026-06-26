import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import pluralize from 'pluralize';
import { twMerge } from 'tailwind-merge';

export { pluralize };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
