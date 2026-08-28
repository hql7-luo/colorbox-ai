import "server-only";

/**
 * The server is the single source of truth for public demo mode.
 * Client components receive this value through PublicDemoProvider.
 */
export const PUBLIC_DEMO_MODE = process.env.PUBLIC_DEMO_MODE === "true";
