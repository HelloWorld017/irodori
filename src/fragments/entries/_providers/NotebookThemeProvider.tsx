import { useEntriesNotebook } from './EntriesProvider';
import type { ReactNode } from 'react';

export const NotebookThemeProvider = ({ children }: { children: ReactNode }) => {
  const notebook = useEntriesNotebook();
  if (!notebook) {
    return children;
  }

  const style = {
    '--notebook-primary': notebook.color,
    '--color-default-50': 'oklch(from var(--notebook-primary) 0.984 calc(c * 0.08) h)',
    '--color-default-100': 'oklch(from var(--notebook-primary) 0.968 calc(c * 0.16) h)',
    '--color-default-200': 'oklch(from var(--notebook-primary) 0.929 calc(c * 0.3) h)',
    '--color-default-300': 'oklch(from var(--notebook-primary) 0.869 calc(c * 0.48) h)',
    '--color-default-400': 'oklch(from var(--notebook-primary) 0.704 calc(c * 0.87) h)',
    '--color-default-500': 'oklch(from var(--notebook-primary) 0.56 c h)',
    '--color-default-600': 'oklch(from var(--notebook-primary) 0.446 calc(c * 0.93) h)',
    '--color-default-700': 'oklch(from var(--notebook-primary) 0.372 calc(c * 0.95) h)',
    '--color-default-800': 'oklch(from var(--notebook-primary) 0.279 calc(c * 0.89) h)',
    '--color-default-900': 'oklch(from var(--notebook-primary) 0.208 calc(c * 0.91) h)',
    '--color-default-950': 'oklch(from var(--notebook-primary) 0.129 calc(c * 0.91) h)',
    '--color-highlight': 'var(--notebook-primary)',
  };

  const stylesheetContents = Object.entries(style)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');

  const stylesheet = `:root { ${stylesheetContents} }`;
  return (
    <>
      <style>{stylesheet}</style>
      {children}
    </>
  );
};
