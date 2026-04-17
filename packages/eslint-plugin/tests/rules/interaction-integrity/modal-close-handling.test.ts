import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/interaction-integrity/modal-close-handling';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('modal-close-handling', rule, {
  valid: [
    // Modal with onClose
    {
      code: '<Modal open={isOpen} onClose={() => setIsOpen(false)}><p>Content</p></Modal>',
    },
    // Drawer with onCancel
    {
      code: '<Drawer visible={show} onCancel={handleClose}><p>Content</p></Drawer>',
    },
    // Dialog with onDismiss
    {
      code: '<Dialog isOpen={open} onDismiss={close}><p>Content</p></Dialog>',
    },
    // Not a modal component (lowercase div)
    {
      code: '<div open={true}><p>Content</p></div>',
    },
  ],
  invalid: [
    // Modal with open but no close handler
    {
      code: '<Modal open={isOpen}><p>确认删除？</p></Modal>',
      errors: [{ messageId: 'missingClose' }],
    },
    // Drawer with visible but no close handler
    {
      code: '<Drawer visible={show}><p>Content</p></Drawer>',
      errors: [{ messageId: 'missingClose' }],
    },
  ],
});
