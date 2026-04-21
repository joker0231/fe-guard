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
    // --- inlineFieldSchema: valid cases ---
    // .min(1) is "required" semantics, not business validation
    {
      code: `const formSchema = z.object({ name: z.string().min(1, 'Required') });`,
      filename: 'src/routes/form.tsx',
    },
    // No validation chain - plain z.string()
    {
      code: `const formSchema = z.object({ name: z.string(), age: z.number() });`,
      filename: 'src/routes/form.tsx',
    },
    // .optional() / .nullable() alone are not business validation
    {
      code: `const formSchema = z.object({ bio: z.string().optional(), score: z.number().nullable() });`,
      filename: 'src/routes/form.tsx',
    },
    // Field uses imported schema variable (not inline)
    {
      code: `const formSchema = z.object({ password: passwordSchema, email: emailSchema });`,
      filename: 'src/routes/form.tsx',
    },
    // In shared/ directory - skip even with inline validation
    {
      code: `const authSchema = z.object({ password: z.string().min(6) });`,
      filename: 'shared/schemas/auth.ts',
    },
    // In server/ directory - skip
    {
      code: `const authSchema = z.object({ password: z.string().min(6) });`,
      filename: 'server/routes/auth.ts',
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
    // --- inlineFieldSchema: invalid cases ---
    // password with .min(6) - business validation
    {
      code: `const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });`,
      filename: 'src/routes/login.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'email', validations: 'email' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'password', validations: 'min(6)' } },
      ],
    },
    // password with .min(3) and .max(100)
    {
      code: `const registerSchema = z.object({ password: z.string().min(3).max(100) });`,
      filename: 'src/routes/register.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'password', validations: 'max, min(3)' } },
      ],
    },
    // .regex() is business validation
    {
      code: `const formSchema = z.object({ phone: z.string().regex(/^1[3-9]\\d{9}$/) });`,
      filename: 'src/routes/contact.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'phone', validations: 'regex' } },
      ],
    },
    // .url() is business validation
    {
      code: `const formSchema = z.object({ website: z.string().url() });`,
      filename: 'src/routes/profile.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'website', validations: 'url' } },
      ],
    },
    // .min(6).optional() - optional doesn't exempt business validation
    {
      code: `const formSchema = z.object({ nickname: z.string().min(2).optional() });`,
      filename: 'src/routes/settings.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'nickname', validations: 'min(2)' } },
      ],
    },
    // number with .int().positive()
    {
      code: `const formSchema = z.object({ age: z.number().int().positive() });`,
      filename: 'src/routes/profile.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'age', validations: 'positive, int' } },
      ],
    },
    // .length(10) is business validation (> 1)
    {
      code: `const formSchema = z.object({ code: z.string().length(10) });`,
      filename: 'src/routes/verify.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'code', validations: 'length(10)' } },
      ],
    },
    // Mixed: localApiSchema + inlineFieldSchema on same z.object
    {
      code: `const createUserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        age: z.number().int(),
      });`,
      filename: 'src/routes/users.tsx',
      errors: [
        { messageId: 'localApiSchema', data: { name: 'createUserSchema' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'email', validations: 'email' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'password', validations: 'min(8)' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'age', validations: 'int' } },
      ],
    },
    // z.object wrapped in .refine() - should still detect inline field schemas
    {
      code: `const registerSchema = z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        password: z.string().min(3),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords must match',
        path: ['confirmPassword'],
      });`,
      filename: 'src/routes/register.tsx',
      errors: [
        { messageId: 'localApiSchema', data: { name: 'registerSchema' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'name', validations: 'max' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'email', validations: 'email' } },
        { messageId: 'inlineFieldSchema', data: { fieldName: 'password', validations: 'min(3)' } },
      ],
    },
    // z.object wrapped in .transform() - should still detect
    {
      code: `const formSchema = z.object({
        age: z.number().min(18),
      }).transform(data => ({ ...data, isAdult: true }));`,
      filename: 'src/routes/profile.tsx',
      errors: [
        { messageId: 'inlineFieldSchema', data: { fieldName: 'age', validations: 'min(18)' } },
      ],
    },
    // ★ standaloneFieldSchema: standalone z.string().min(6)
    {
      code: `const passwordSchema = z.string().min(6);`,
      filename: 'src/routes/login.tsx',
      errors: [
        { messageId: 'standaloneFieldSchema', data: { name: 'passwordSchema', validations: 'min(6)' } },
      ],
    },
    // ★ standaloneFieldSchema: standalone z.string().email()
    {
      code: `const emailValidator = z.string().email();`,
      filename: 'src/utils/validators.ts',
      errors: [
        { messageId: 'standaloneFieldSchema', data: { name: 'emailValidator', validations: 'email' } },
      ],
    },
    // ★ standaloneFieldSchema: standalone z.number().min(18).max(120)
    {
      code: `const ageSchema = z.number().min(18).max(120);`,
      filename: 'src/schemas/user.ts',
      errors: [
        { messageId: 'standaloneFieldSchema', data: { name: 'ageSchema', validations: 'max, min(18)' } },
      ],
    },
    // ★ standaloneFieldSchema: z.string().regex() standalone
    {
      code: `const phoneSchema = z.string().regex(/^1[3-9]\\d{9}$/);`,
      filename: 'src/routes/profile.tsx',
      errors: [
        { messageId: 'standaloneFieldSchema', data: { name: 'phoneSchema', validations: 'regex' } },
      ],
    },
    // ★ standaloneFieldSchema: z.string().url() standalone
    {
      code: `const websiteSchema = z.string().url();`,
      filename: 'src/routes/settings.tsx',
      errors: [
        { messageId: 'standaloneFieldSchema', data: { name: 'websiteSchema', validations: 'url' } },
      ],
    },
    // ★ standaloneFieldSchema: z.string().min(3).optional() — optional doesn't exempt
    {
      code: `const nicknameField = z.string().min(3).optional();`,
      filename: 'src/routes/profile.tsx',
      errors: [
        { messageId: 'standaloneFieldSchema', data: { name: 'nicknameField', validations: 'min(3)' } },
      ],
    },
  ],
});