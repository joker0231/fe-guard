import { createRule } from '../../utils/rule-helpers';
import { extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const MUTATION_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];

export default createRule({
  name: 'no-state-mutation',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow direct mutation of React state' },
    schema: [],
    messages: {
      stateMutation:
        "直接修改state变量 '{{stateName}}'（`{{mutationMethod}}`）不会触发React重渲染。请使用 `{{setterName}}([...{{stateName}}, newItem])` 创建新引用。",
    },
  },
  defaultOptions: [],
  create(context) {
    const statePairs = new Map<string, string>(); // state name -> setter name

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const pair = extractUseStatePair(node);
        if (pair) {
          statePairs.set(pair.state, pair.setter);
        }
      },

      // state.push(...), state.sort(), etc
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression') return;
        const obj = node.callee.object;
        const prop = node.callee.property;
        if (obj.type !== 'Identifier' || prop.type !== 'Identifier') return;

        if (!statePairs.has(obj.name)) return;
        if (!MUTATION_METHODS.includes(prop.name)) return;

        context.report({
          node,
          messageId: 'stateMutation',
          data: {
            stateName: obj.name,
            mutationMethod: `${obj.name}.${prop.name}()`,
            setterName: statePairs.get(obj.name)!,
          },
        });
      },

      // delete state.prop
      UnaryExpression(node: TSESTree.UnaryExpression) {
        if (node.operator !== 'delete') return;
        if (node.argument.type !== 'MemberExpression') return;
        if (node.argument.object.type !== 'Identifier') return;

        const stateName = node.argument.object.name;
        if (!statePairs.has(stateName)) return;

        const propText = node.argument.property.type === 'Identifier'
          ? `${stateName}.${node.argument.property.name}`
          : `${stateName}[key]`;

        context.report({
          node,
          messageId: 'stateMutation',
          data: {
            stateName,
            mutationMethod: `delete ${propText}`,
            setterName: statePairs.get(stateName)!,
          },
        });
      },

      // state[0] = ... or state.property = ...
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const left = node.left;
        if (left.type !== 'MemberExpression') return;
        if (left.object.type !== 'Identifier') return;

        if (!statePairs.has(left.object.name)) return;

        const propText = left.property.type === 'Identifier'
          ? left.object.name + '.' + left.property.name
          : left.object.name + '[index]';

        const data = {
          stateName: left.object.name,
          mutationMethod: `${propText} = ...`,
          setterName: statePairs.get(left.object.name)!,
        };

        context.report({
          node,
          messageId: 'stateMutation',
          data,
        });
      },
    };
  },
});
