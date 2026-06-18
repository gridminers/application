/** Application environment configuration. */
export interface Environment {
  /** Base URL for the REST API. Same-origin `/api` by default (proxied/served). */
  apiBaseUrl: string;
  /** When true, seed the app from `MOCK_PROJECTS` instead of the live API. */
  useMockData: boolean;
}
