/**
 * @file utils.ts
 * @description 通用工具函数集合，提供 className 合并等基础能力
 * @module web-frontend/lib
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 className 工具函数：先用 clsx 处理条件类名，再用 twMerge 解决 Tailwind 类名冲突
 * @param inputs - 任意数量的类名输入（字符串、对象、数组等 ClassValue）
 * @returns 合并并去重后的最终类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
