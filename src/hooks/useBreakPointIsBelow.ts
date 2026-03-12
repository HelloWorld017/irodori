import { useLayoutEffect, useState } from 'react';

const BREAKPOINT_MAX_WIDTH_MAP = {
  lg: 1023.98,
} as const;

type BreakpointKey = keyof typeof BREAKPOINT_MAX_WIDTH_MAP;

const getMediaQuery = (breakpoint: BreakpointKey) =>
  `(max-width: ${BREAKPOINT_MAX_WIDTH_MAP[breakpoint]}px)`;

export const useBreakPointIsBelow = (breakpoint: BreakpointKey) => {
  const [matches, setMatches] = useState(() => matchMedia(getMediaQuery(breakpoint)).matches);

  useLayoutEffect(() => {
    const mediaQuery = matchMedia(getMediaQuery(breakpoint));
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return matches;
};
