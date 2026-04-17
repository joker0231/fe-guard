import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, hasJSXAttribute } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const MODAL_COMPONENTS = /^(Modal|Dialog|Drawer|Popup|Sheet|BottomSheet)$/;
const OPEN_PROPS = ['open', 'visible', 'isOpen', 'show'];
const CLOSE_PROPS = ['onClose', 'onCancel', 'onDismiss', 'onOpenChange', 'onHide'];

export default createRule({
  name: 'modal-close-handling',
  meta: {
    type: 'problem',
    docs: { description: 'Require close handler on modal/dialog/drawer components' },
    schema: [],
    messages: {
      missingClose: "<{{component}}> 设置了 '{{openProp}}' 控制显示，但缺少关闭回调（如 onClose/onCancel/onDismiss）。用户将无法关闭此弹层。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getJSXElementName(node);
        if (!MODAL_COMPONENTS.test(name)) return;

        const openProp = OPEN_PROPS.find((p) => hasJSXAttribute(node, p));
        if (!openProp) return;

        const hasClose = CLOSE_PROPS.some((p) => hasJSXAttribute(node, p));
        if (hasClose) return;

        context.report({ node, messageId: 'missingClose', data: { component: name, openProp } });
      },
    };
  },
});
