import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, hasJSXAttribute } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const TAB_COMPONENTS = /^(Tabs|Collapse|Accordion)$/;
const DEFAULT_PROPS = ['defaultActiveKey', 'defaultValue', 'defaultIndex', 'defaultSelectedKeys'];
const CONTROLLED_PROPS = ['activeKey', 'value', 'selectedKeys', 'activeIndex'];

export default createRule({
  name: 'tab-default-active',
  meta: {
    type: 'problem',
    docs: { description: 'Require default active item on tab/collapse/accordion components' },
    schema: [],
    messages: {
      missingDefault: "<{{component}}> 缺少默认激活项（如 defaultActiveKey 或 activeKey），首次渲染时将显示空白内容区域。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getJSXElementName(node);
        if (!TAB_COMPONENTS.test(name)) return;

        const hasDefault = DEFAULT_PROPS.some((p) => hasJSXAttribute(node, p));
        if (hasDefault) return;

        const hasControlled = CONTROLLED_PROPS.some((p) => hasJSXAttribute(node, p));
        if (hasControlled) return;

        context.report({ node, messageId: 'missingDefault', data: { component: name } });
      },
    };
  },
});
