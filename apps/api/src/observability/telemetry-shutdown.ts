// Point de rencontre entre src/instrumentation.ts (chargé avant l'application)
// et main.ts : l'arrêt de l'application envoie ensuite les spans en attente.
type ShutdownHook = () => Promise<void>;

const hooks: ShutdownHook[] = [];

export function onTelemetryShutdown(hook: ShutdownHook): void {
  hooks.push(hook);
}

export async function shutdownTelemetry(): Promise<void> {
  await Promise.allSettled(hooks.map((hook) => hook()));
}
