// Nom de tâche Cloud Tasks : [A-Za-z0-9_-] uniquement.
// Une tâche par symbole et par jour : relancer le dispatch le même jour ne
// recrée pas les tâches déjà présentes.
export function ingestionTaskId(symbol: string, date: string): string {
  return `${symbol.replace(/[^A-Za-z0-9_-]/g, '_')}-${date}`;
}
