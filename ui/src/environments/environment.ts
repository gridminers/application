import { Environment } from './environment.model';

/**
 * Production environment. `apiBaseUrl` is same-origin `/api`; set it to the
 * real backend origin if production is not served from the same host.
 */
export const environment: Environment = {
  apiBaseUrl: '/api',
  useMockData: false,
};
