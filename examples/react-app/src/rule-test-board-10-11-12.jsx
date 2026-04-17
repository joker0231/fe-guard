/**
 * Board 10-12 规则逐条验证
 */
import React from 'react';

// ═══ Board 10: Security ═══

// [expect: guard/no-raw-dangerously-set-innerhtml]
export function Test_noRawDangerously({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ═══ Board 11: AI Smell ═══

// [expect: guard/no-placeholder-url]
export function Test_noPlaceholder() {
  return <a href="https://example.com/api">Link</a>;
}

// [expect: guard/no-todo-in-production]
export function Test_noTodo() {
  // TODO: finish this
  return <div>WIP</div>;
}

// [expect: guard/no-scattered-constants]
export function Test_noScattered() {
  return <img src="https://cdn.example.com/logo.png" alt="logo" />;
}

// ═══ Board 12: Visual Integrity ═══

// [expect: guard/no-hardcoded-pixel-width]
export function Test_noHardcodedWidth() {
  return <div style={{ width: '500px' }}>Wide</div>;
}

// [expect: guard/text-overflow-handling]
export function Test_textOverflow({ text }) {
  return <div style={{ width: '200px' }}>{text}</div>;
}

// [expect: guard/dynamic-content-overflow]
export function Test_dynamicOverflow({ content }) {
  return <div style={{ height: '100px' }}>{content}</div>;
}

// [expect: guard/image-adaptability]
export function Test_imageAdaptability() {
  return <img src="/photo.jpg" alt="photo" />;
}

// [expect: guard/flex-wrap-required]
export function Test_flexWrap({ tags }) {
  return <div style={{ display: 'flex' }}>{tags.map(t => <span key={t}>{t}</span>)}</div>;
}
