const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function renderTemplate(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined>,
  allowedVariables: string[],
): string {
  return template.replace(VARIABLE_PATTERN, (_match, key: string) => {
    if (!allowedVariables.includes(key)) {
      return '';
    }
    const value = variables[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(VARIABLE_PATTERN);
  return [...new Set([...matches].map((match) => match[1]))];
}
