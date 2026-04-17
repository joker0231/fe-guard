import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/ai-smell/max-component-lines';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// Helper to generate lines of code
function genLines(n: number): string {
  return Array.from({ length: n }, (_, i) => `  const v${i} = ${i};`).join('\n');
}

ruleTester.run('max-component-lines', rule, {
  valid: [
    // Short component (well under limit)
    {
      code: `
        function SmallComponent() {
          const [count, setCount] = useState(0);
          return <div>{count}</div>;
        }
      `,
    },
    // Arrow function component
    {
      code: `
        const SmallArrow = () => {
          return <span>hello</span>;
        };
      `,
    },
    // Direct JSX return arrow
    {
      code: 'const Inline = () => <div>inline</div>;',
    },
    // Non-component function (no JSX) can be long
    {
      code: `
        function utilityFunction() {
          ${genLines(250)}
          return 42;
        }
      `,
    },
    // Component under custom limit
    {
      code: `
        function MediumComponent() {
          ${genLines(80)}
          return <div>medium</div>;
        }
      `,
      options: [{ maxLines: 100 }],
    },
  ],
  invalid: [
    // Component exceeding default 200 lines
    {
      code: `
        function HugeComponent() {
          ${genLines(200)}
          return <div>huge</div>;
        }
      `,
      errors: [{ messageId: 'tooManyLines' }],
    },
    // Arrow component exceeding limit
    {
      code: `
        const HugeArrow = () => {
          ${genLines(200)}
          return <span>big</span>;
        };
      `,
      errors: [{ messageId: 'tooManyLines' }],
    },
    // Component exceeding custom limit
    {
      code: `
        function SmallButOverLimit() {
          ${genLines(55)}
          return <div>over</div>;
        }
      `,
      options: [{ maxLines: 50 }],
      errors: [{ messageId: 'tooManyLines' }],
    },
    // Function expression component
    {
      code: `
        const BigFunc = function BigComponent() {
          ${genLines(200)}
          return <div>big func</div>;
        };
      `,
      errors: [{ messageId: 'tooManyLines' }],
    },
  ],
});