import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind className（处理冲突+去重）
 * 所有 UI 组件都应使用这个 helper 来合并 className
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}