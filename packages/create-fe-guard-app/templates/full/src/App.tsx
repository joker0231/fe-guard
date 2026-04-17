import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const [_count, _setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center">
          <h1 className="text-lg font-semibold">{'{{PROJECT_NAME}}'}</h1>
        </div>
      </header>
      <main className="container py-8">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-2 text-xl font-semibold">欢迎使用 fe-guard 脚手架</h2>
          <p className="text-muted-foreground">
            这是一个预配置了 fe-guard 规则、基础组件、通用 Hooks 的前端项目。
            开始在 <code className="rounded bg-muted px-1 py-0.5 text-sm">src/pages</code> 编写你的业务页面。
          </p>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default App;