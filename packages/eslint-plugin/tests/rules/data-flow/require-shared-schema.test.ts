import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-flow/require-shared-schema';

const tester = new RuleTester();

tester.run('require-shared-schema', rule, {
  valid: [
    // Small local schema (< 3 fields) with schema suffix
    {
      code: `const formUISchema = z.object({ expanded: z.boolean(), tab: z.string() });`,
      filename: 'src/components/form.tsx',
    },
    // Derived from shared schema
    {
      code: `const formSchema = CreateTaskInputSchema.pick({ title: true, status: true });`,
      filename: 'src/routes/tasks.tsx',
    },
    // In shared/ directory - skip
    {
      code: `const CreateTaskInputSchema = z.object({ title: z.string(), status: z.string(), priority: z.string(), assigneeId: z.string() });`,
      filename: 'shared/schemas/task.ts',
    },
    // In test file - skip
    {
      code: `const createTestSchema = z.object({ title: z.string(), status: z.string(), priority: z.string(), assigneeId: z.string() });`,
      filename: 'src/routes/tasks.test.tsx',
    },
    // In components/ui/ - skip
    {
      code: `const createFormSchema = z.object({ title: z.string(), status: z.string(), priority: z.string(), assigneeId: z.string() });`,
      filename: 'src/components/ui/form.tsx',
    },
    // No API prefix - just a UI schema with many fields
    {
      code: `const filterState = z.object({ search: z.string(), page: z.number(), sort: z.string(), dir: z.string() });`,
      filename: 'src/hooks/use-filter.ts',
    },
    // Has Schema suffix but no API operation prefix
    {
      code: `const uiStateSchema = z.object({ a: z.string(), b: z.string() });`,
      filename: 'src/store/ui.ts',
    },
    // Not z.object
    {
      code: `const createTaskSchema = z.string();`,
      filename: 'src/routes/tasks.tsx',
    },
  ],
  invalid: [
    // API schema defined locally - createTaskSchema
    {
      code: `const createTaskSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(['todo', 'in_progress']),
        priority: z.enum(['low', 'medium', 'high']),
        assigneeId: z.string().optional(),
        dueDate: z.string().nullable(),
        tags: z.array(z.string()),
      });`,
      filename: 'src/routes/tasks.new.tsx',
      errors: [{ messageId: 'localApiSchema', data: { name: 'createTaskSchema' } }],
    },
    // UpdateUserInput
    {
      code: `const updateUserInput = z.object({ name: z.string(), email: z.string() });`,
      filename: 'src/pages/profile.tsx',
      errors: [{ messageId: 'localApiSchema', data: { name: 'updateUserInput' } }],
    },
    // deleteItemPayload
    {
      code: `const deleteItemPayload = z.object({ id: z.string() });`,
      filename: 'src/api/items.ts',
      errors: [{ messageId: 'localApiSchema', data: { name: 'deleteItemPayload' } }],
    },
    // Large schema with Schema suffix (>= 3 fields)
    {
      code: `const taskFormSchema = z.object({ title: z.string(), status: z.string(), priority: z.string() });`,
      filename: 'src/routes/tasks.tsx',
      errors: [{ messageId: 'localApiSchema', data: { name: 'taskFormSchema' } }],
    },
    // submitOrderRequest
    {
      code: `const submitOrderRequest = z.object({ items: z.array(z.string()), total: z.number() });`,
      filename: 'src/checkout/order.tsx',
      errors: [{ messageId: 'localApiSchema', data: { name: 'submitOrderRequest' } }],
    },
    // fetchUserParams
    {
      code: `const fetchUserParams = z.object({ id: z.string() });`,
      filename: 'src/hooks/use-user.ts',
      errors: [{ messageId: 'localApiSchema', data: { name: 'fetchUserParams' } }],
    },
  ],
});
