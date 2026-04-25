import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode } from 'react';

export const buildTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

export const QueryWrapper = ({ children }: { children: ReactNode }) => {
  const client = buildTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

export const wrapInQueryClient = (ui: ReactElement): ReactElement => (
  <QueryWrapper>{ui}</QueryWrapper>
);
