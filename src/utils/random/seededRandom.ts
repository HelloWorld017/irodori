const MAX_UINT32 = -1 >>> 0;

const murmurhash2 = (str: string): number => {
  let h = 0;

  let k = 0;
  let i = 0;
  let len = str.length;
  for (; len >= 4; ++i, len -= 4) {
    k =
      (str.charCodeAt(i) & 0xff) |
      ((str.charCodeAt(++i) & 0xff) << 8) |
      ((str.charCodeAt(++i) & 0xff) << 16) |
      ((str.charCodeAt(++i) & 0xff) << 24);

    k = (k & 0xffff) * 0x5bd1e995 + (((k >>> 16) * 0xe995) << 16);
    k ^= k >>> 24;
    h =
      ((k & 0xffff) * 0x5bd1e995 + (((k >>> 16) * 0xe995) << 16)) ^
      ((h & 0xffff) * 0x5bd1e995 + (((h >>> 16) * 0xe995) << 16));
  }

  switch (len) {
    case 3:
      h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
      break;
    case 2:
      h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
      break;
    case 1:
      h ^= str.charCodeAt(i) & 0xff;
      h = (h & 0xffff) * 0x5bd1e995 + (((h >>> 16) * 0xe995) << 16);
      break;
  }

  h ^= h >>> 13;
  h = (h & 0xffff) * 0x5bd1e995 + (((h >>> 16) * 0xe995) << 16);
  h ^= h >>> 15;

  return Math.max(0, ((h >>> 0) - 1) / MAX_UINT32);
};

export const seededRandom = murmurhash2;
