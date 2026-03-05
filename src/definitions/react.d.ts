declare module 'react' {
  interface CSSProperties {
    [index: `--${string}`]: string | number | undefined;
  }
}

export {};
