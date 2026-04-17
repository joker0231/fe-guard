const COMPONENT_EXTENSIONS = /\.(tsx|jsx|ts|js)$/;
const EXCLUDED_DIRS = /[\\/](node_modules|__tests__|__mocks__|\.test\.|\.spec\.|\.stories\.)[\\/]?/;
const TEST_FILE_PATTERN = /\.(test|spec|stories)\.(tsx|jsx|ts|js)$/;

const ROUTE_CONFIG_PATTERNS = [
  /routes\.(tsx|ts|js|jsx)$/,
  /router\.(tsx|ts|js|jsx)$/,
  /route-config\.(tsx|ts|js|jsx)$/,
  /routing\.(tsx|ts|js|jsx)$/,
  /[\\/]routes[\\/]index\.(tsx|ts|js|jsx)$/,
  /[\\/]router[\\/]index\.(tsx|ts|js|jsx)$/,
];

const PAGE_DIR_PATTERNS = /[\\/](pages|views)[\\/]/;

/**
 * 判断文件是否为组件文件（.tsx/.jsx/.ts/.js，排除 node_modules 和测试文件）
 */
export function isComponentFile(id: string): boolean {
  if (!COMPONENT_EXTENSIONS.test(id)) return false;
  if (EXCLUDED_DIRS.test(id)) return false;
  if (TEST_FILE_PATTERN.test(id)) return false;
  return true;
}

/**
 * 判断文件是否为路由配置文件
 */
export function isRouteConfig(id: string): boolean {
  return ROUTE_CONFIG_PATTERNS.some((pattern) => pattern.test(id));
}

/**
 * 判断文件是否为页面组件（位于 pages/ 或 views/ 目录下）
 */
export function isPageComponent(id: string): boolean {
  return PAGE_DIR_PATTERNS.test(id) && isComponentFile(id);
}
