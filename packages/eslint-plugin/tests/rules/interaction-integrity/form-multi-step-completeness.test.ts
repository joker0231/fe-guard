import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/interaction-integrity/form-multi-step-completeness';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('form-multi-step-completeness', rule, {
  valid: [
    // Multi-step form with Steps indicator
    {
      code: `
function Wizard() {
  const [step, setStep] = useState(1);
  return (
    <div>
      <Steps current={step} />
      {step === 1 && <BasicInfo onNext={() => setStep(2)} />}
      {step === 2 && <Confirm onBack={() => setStep(1)} />}
    </div>
  );
}`,
    },
    // Multi-step form with back navigation (setStep(step - 1))
    {
      code: `
function Wizard() {
  const [step, setStep] = useState(1);
  return (
    <div>
      {step === 1 && <BasicInfo onNext={() => setStep(2)} />}
      {step === 2 && <Confirm onBack={() => setStep(step - 1)} />}
    </div>
  );
}`,
    },
    // No step conditional, so not flagged as multi-step
    {
      code: `
function SimpleForm() {
  const [name, setName] = useState('');
  return <input value={name} onChange={e => setName(e.target.value)} />;
}`,
    },
  ],
  invalid: [
    // Multi-step form without Steps indicator or back navigation
    {
      code: `
function Wizard() {
  const [step, setStep] = useState(1);
  return (
    <div>
      {step === 1 && <BasicInfo onNext={() => setStep(2)} />}
      {step === 2 && <PaymentInfo onNext={() => setStep(3)} />}
      {step === 3 && <Confirmation />}
    </div>
  );
}`,
      errors: [{ messageId: 'missingStepIndicator' }],
    },
  ],
});
