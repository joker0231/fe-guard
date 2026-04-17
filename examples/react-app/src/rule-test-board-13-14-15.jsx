/**
 * Board 13-15 规则逐条验证
 */
import React, { useState } from 'react';

// ═══ Board 13: Interaction Integrity ═══

// [expect: guard/modal-close-handling]
export function Test_modalClose() {
  const [open, setOpen] = useState(false);
  return <Modal open={open}><p>内容</p></Modal>;
}

// [expect: guard/tab-default-active]
export function Test_tabDefault() {
  return (
    <Tabs>
      <TabPane tab="Tab1" key="1" />
      <TabPane tab="Tab2" key="2" />
    </Tabs>
  );
}

// [expect: guard/table-empty-state]
export function Test_tableEmpty({ users }) {
  return <Table dataSource={users} columns={[]} />;
}

// [expect: guard/form-multi-step-completeness]
export function Test_formMultiStep() {
  const [step, setStep] = useState(1);
  return (
    <div>
      {step === 1 && <div>Step 1</div>}
      {step === 2 && <div>Step 2</div>}
      <button onClick={() => setStep(step + 1)}>Next</button>
    </div>
  );
}

// ═══ Board 14: State Completeness ═══

// [expect: guard/operation-feedback]
export function Test_operationFeedback() {
  const handleDelete = async () => {
    await fetch('/api/delete', {
      method: 'DELETE',
      signal: new AbortController().signal,
    });
  };
  return <button onClick={handleDelete}>Delete</button>;
}

// ═══ Board 15: Data Display ═══

// [expect: guard/no-enum-raw-render]
export function Test_noEnumRaw({ order }) {
  return <span>{order.status}</span>;
}

// [expect: guard/no-number-unformatted]
export function Test_noNumberRaw({ product }) {
  return <span>{product.price}</span>;
}

// [expect: guard/no-date-raw-render]
export function Test_noDateRaw({ item }) {
  return <span>{item.createdAt}</span>;
}

// [expect: guard/no-boolean-raw-render]
export function Test_noBooleanRaw({ user }) {
  return <span>{user.isActive}</span>;
}

// [expect: guard/no-null-render] — in JSX attribute position
export function Test_noNullRender({ config }) {
  return <Component title={config.label} />;
}
