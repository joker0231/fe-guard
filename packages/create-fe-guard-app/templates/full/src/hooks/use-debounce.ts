/**
 * useDebounce — 防抖 Hook
 *
 * 对值做防抖：value 变化后 delayMs 毫秒内没有再次变化，才更新返回值。
 * 用于搜索输入等场景。
 *
 * 使用：
 *   const [keyword, setKeyword] = useState('');
 *   const debouncedKeyword = useDebounce(keyword, 300);
 *
 *   useEffect(() => {
 *     if (debouncedKeyword) fetchResults(debouncedKeyword);
 *   }, [debouncedKeyword]);
 *
 *   <input value={keyword} onChange={e => setKeyword(e.target.value)} />
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return (): void => {
      clearTimeout(timerId);
    };
  }, [value, delayMs]);

  return debouncedValue;
}