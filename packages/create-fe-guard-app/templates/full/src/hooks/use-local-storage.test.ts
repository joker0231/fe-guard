import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useLocalStorage } from './use-local-storage';

const PrefSchema = z.object({
  theme: z.enum(['light', 'dark']),
  fontSize: z.number(),
});

type Pref = z.infer<typeof PrefSchema>;

const defaultPref: Pref = { theme: 'light', fontSize: 14 };

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('无存储值 → 使用 defaultValue', () => {
    const { result } = renderHook(() =>
      useLocalStorage({
        key: 'pref',
        schema: PrefSchema,
        defaultValue: defaultPref,
      }),
    );
    const [value] = result.current;
    expect(value).toEqual(defaultPref);
  });

  it('有合法存储值 → 使用存储值', () => {
    const stored: Pref = { theme: 'dark', fontSize: 18 };
    window.localStorage.setItem('pref', JSON.stringify(stored));

    const { result } = renderHook(() =>
      useLocalStorage({
        key: 'pref',
        schema: PrefSchema,
        defaultValue: defaultPref,
      }),
    );
    const [value] = result.current;
    expect(value).toEqual(stored);
  });

  it('存储值格式不匹配 schema → fallback 到 defaultValue', () => {
    window.localStorage.setItem('pref', JSON.stringify({ theme: 'purple', fontSize: 'big' }));

    const { result } = renderHook(() =>
      useLocalStorage({
        key: 'pref',
        schema: PrefSchema,
        defaultValue: defaultPref,
      }),
    );
    const [value] = result.current;
    expect(value).toEqual(defaultPref);
  });

  it('存储值不是合法 JSON → fallback 到 defaultValue', () => {
    window.localStorage.setItem('pref', 'not-a-json{{');

    const { result } = renderHook(() =>
      useLocalStorage({
        key: 'pref',
        schema: PrefSchema,
        defaultValue: defaultPref,
      }),
    );
    const [value] = result.current;
    expect(value).toEqual(defaultPref);
  });

  it('setValue 更新 state 并写入 localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage({
        key: 'pref',
        schema: PrefSchema,
        defaultValue: defaultPref,
      }),
    );

    const next: Pref = { theme: 'dark', fontSize: 20 };
    act(() => {
      const [, setValue] = result.current;
      setValue(next);
    });

    const [value] = result.current;
    expect(value).toEqual(next);

    const raw = window.localStorage.getItem('pref');
    expect(raw).not.toBeNull();
    expect(raw === null ? null : JSON.parse(raw)).toEqual(next);
  });

  it('localStorage.setItem 抛错 → state 仍更新，不崩溃', () => {
    const { result } = renderHook(() =>
      useLocalStorage({
        key: 'pref',
        schema: PrefSchema,
        defaultValue: defaultPref,
      }),
    );

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const next: Pref = { theme: 'dark', fontSize: 22 };
    expect(() => {
      act(() => {
        const [, setValue] = result.current;
        setValue(next);
      });
    }).not.toThrow();

    const [value] = result.current;
    expect(value).toEqual(next);

    spy.mockRestore();
  });
});