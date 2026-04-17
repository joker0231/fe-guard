import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/state-completeness/operation-feedback';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('operation-feedback', rule, {
  valid: [
    // Async handler with loading state and success feedback
    {
      code: `
<button onClick={async () => {
  setLoading(true);
  try {
    await saveData();
    message.success('保存成功');
  } catch (e) {
    message.error('保存失败');
  } finally {
    setLoading(false);
  }
}}>Save</button>`,
    },
    // Synchronous handler (no async, not flagged)
    {
      code: '<button onClick={() => doSync()}>Sync action</button>',
    },
    // Async handler with navigate as success feedback
    {
      code: `
<button onClick={async () => {
  setSubmitting(true);
  await createItem();
  navigate('/list');
}}>Create</button>`,
    },
  ],
  invalid: [
    // Async handler without any feedback
    {
      code: `
<button onClick={async () => {
  await saveData();
}}>Save</button>`,
      errors: [{ messageId: 'missingFeedback' }],
    },
    // Delete context without confirm dialog
    {
      code: `
<button onClick={async () => {
  await deleteItem(id);
}}>删除</button>`,
      errors: [
        { messageId: 'deleteWithoutConfirm' },
        { messageId: 'missingFeedback' },
      ],
    },
  ],
});
