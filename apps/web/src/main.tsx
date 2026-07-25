import '@asterism/ui/globals.css';
import './i18n';

import { ThemeProvider, Toaster, TooltipProvider } from '@asterism/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import { router } from './router';

async function bootstrap() {
  // 渲染前执行，避免应用先用旧状态启动 embedding bootstrap；DEV 守卫保证
  // 重置模块不进生产包。
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('reset-smart-search')
  ) {
    const { resetSmartSearchState } = await import('./dev/reset-smart-search');
    await resetSmartSearchState();
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #root was not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap();
