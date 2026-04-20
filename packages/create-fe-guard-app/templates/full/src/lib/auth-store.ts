/**
 * Auth Store 骨架 — 登录状态管理 + 持久化
 *
 * 结构约束：
 * - Zustand + persist 中间件，token/user 自动存 localStorage
 * - 页面刷新后自动恢复登录状态
 * - 提供 login / logout / updateUser actions
 *
 * 留白区域（AI 根据业务填写）：
 * - User 类型定义（字段根据业务需求）
 * - token 刷新逻辑（可选，如 refreshToken 机制）
 * - 过期检测逻辑（可选，如 JWT decode 检查 exp）
 * - 登出时的清理逻辑（清缓存、断 WebSocket 等）
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
// 留白区域：定义 User 类型（根据业务需求补充字段）
// ============================================================
interface User {
  id: string;
  email: string;
  name: string;
  // AI 根据业务补充：avatar / role / permissions 等
}

// ============================================================
// Store 类型定义（结构约束，AI 不应修改签名）
// ============================================================
interface AuthState {
  // 状态
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  getToken: () => string | null;
}

// ============================================================
// 留白区域：Storage key（AI 可根据项目修改）
// ============================================================
const STORAGE_KEY = 'auth-storage';

// ============================================================
// Store 实现
// ============================================================
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      token: null,
      user: null,
      isAuthenticated: false,

      // 登录：存储 token + user
      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      // 登出：清除所有状态
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
        // ============================================================
        // 留白区域：登出时的额外清理逻辑
        // AI 根据业务补充：断开 WebSocket、清除其他缓存等
        // ============================================================
      },

      // 更新用户信息（部分更新）
      updateUser: (partial: Partial<User>) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...partial } });
        }
      },

      // 获取当前 token（供 http-client 使用）
      getToken: () => get().token,
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 只持久化必要字段（不持久化 isAuthenticated，由 token 存在性推导）
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      // 恢复时重算 isAuthenticated
      onRehydrate: (_state, error) => {
        if (error) {
          console.error('[AUTH] Failed to restore auth state:', error);
        }
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<AuthState>) };
        // 从持久化数据推导 isAuthenticated
        merged.isAuthenticated = merged.token !== null && merged.user !== null;
        return merged;
      },
    }
  )
);

// ============================================================
// 留白区域：Token 过期检测（可选）
// AI 如需 JWT 过期检测，在此实现
// ============================================================
// export function isTokenExpired(token: string): boolean {
//   try {
//     const payload = JSON.parse(atob(token.split('.')[1]));
//     return payload.exp * 1000 < Date.now();
//   } catch {
//     return true;
//   }
// }

// ============================================================
// 留白区域：Token 刷新（可选）
// AI 如需 refresh token 机制，在此实现
// ============================================================
// export async function refreshToken(): Promise<string | null> {
//   const currentToken = useAuthStore.getState().token;
//   if (!currentToken) return null;
//   // 调用后端 refresh 接口...
//   return null;
// }