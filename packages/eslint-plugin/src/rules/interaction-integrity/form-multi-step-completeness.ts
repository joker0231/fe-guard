import { createRule } from '../../utils/rule-helpers';
import { extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const STEP_VAR_PATTERN = /^(step|current|activeStep|currentStep)$/i;
const STEP_INDICATOR_PATTERN = /^(Steps|Stepper|Progress|StepIndicator|ProgressBar)$/;

export default createRule({
  name: 'form-multi-step-completeness',
  meta: {
    type: 'problem',
    docs: { description: 'Require step indicator or back navigation in multi-step forms' },
    schema: [],
    messages: {
      missingStepIndicator: "多步骤表单使用 '{{stepVar}}' 控制步骤，但缺少步骤指示器（如 <Steps>）或返回上一步功能。用户无法了解进度或回退修改。",
    },
  },
  defaultOptions: [],
  create(context) {
    const stepStates: Array<{ state: string; setter: string; node: TSESTree.Node }> = [];
    let hasStepIndicator = false;
    let hasStepComparison = false;
    let hasBackNavigation = false;

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const pair = extractUseStatePair(node);
        if (pair && STEP_VAR_PATTERN.test(pair.state)) {
          stepStates.push({ state: pair.state, setter: pair.setter, node });
        }
      },
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '===' && node.operator !== '==') return;
        const left = node.left;
        if (left.type === 'Identifier' && stepStates.some((s) => s.state === left.name)) {
          hasStepComparison = true;
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        // Detect back navigation: setter called with subtraction (e.g., setStep(step - 1))
        if (node.callee.type === 'Identifier') {
          const calleeName = node.callee.name;
          if (stepStates.some((s) => s.setter === calleeName)) {
            const arg = node.arguments[0];
            if (arg && arg.type === 'BinaryExpression' && arg.operator === '-') {
              hasBackNavigation = true;
            }
          }
        }
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type === 'JSXIdentifier' && STEP_INDICATOR_PATTERN.test(node.name.name)) {
          hasStepIndicator = true;
        }
      },
      'Program:exit'() {
        if (stepStates.length === 0 || !hasStepComparison) return;
        if (hasStepIndicator || hasBackNavigation) return;

        for (const s of stepStates) {
          context.report({
            node: s.node,
            messageId: 'missingStepIndicator',
            data: { stepVar: s.state },
          });
        }
      },
    };
  },
});
