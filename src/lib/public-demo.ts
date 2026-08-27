export const PUBLIC_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function allowsPersistentOrderActions(publicDemo = PUBLIC_DEMO_MODE) {
  return !publicDemo;
}
