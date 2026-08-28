export function allowsPersistentOrderActions(publicDemo: boolean) {
  return !publicDemo;
}

export function shouldGenerateOrderLocally({
  selectedDemo,
  publicDemo,
}: {
  selectedDemo: boolean;
  publicDemo: boolean;
}) {
  return selectedDemo || publicDemo;
}
