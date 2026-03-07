export type CacheEvents<T, K = string> = {
  /**
   * Emitted when a value is found in the cache.
   *
   * @event CacheEvents#'cache:hit'
   */
  'cache:hit': (key: K, value: T) => void;

  /**
   * Emitted when a value is not found in the cache.
   *
   * @event CacheEvents#'cache:miss'
   */
  'cache:miss': (key: K) => void;

  /**
   * Emitted when a value is set in the cache.
   *
   * @event CacheEvents#'cache:set'
   */
  'cache:set': (key: K, value: T) => void;

  /**
   * Emitted when a value is deleted from the cache.
   *
   * @event CacheEvents#'cache:deleted'
   */
  'cache:deleted': (key: K) => void;
};
