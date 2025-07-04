export type CacheEvents<T, K = string> = {
  'cache:hit': (key: K, value: T) => void;
  'cache:miss': (key: K) => void;
  'cache:set': (key: K, value: T) => void;
  'cache:deleted': (key: K) => void;
};
