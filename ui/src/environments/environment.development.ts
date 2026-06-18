import { Environment } from './environment.model';

/** Development environment. Calls the same-origin `/api` proxied to the backend. */
export const environment: Environment = {
  apiBaseUrl: '/api',
  useMockData: false,
};
