import { Store } from '@sektek/utility-belt';

import { CacheStore, CacheStoreOptions } from './cache-store.js';

/**
 * Options for the FallbackCacheStore constructor.
 * @template T - The type of values stored in the cache.
 * @template K - The type of keys used to access the cache.
 *               Defaults to string.
 * @property {Store<T, K>} store - The underlying store to retrieve values from.
 * @property {Store<T, K>} [cache] - An optional cache store to use for caching values.
 *                                   If not provided, a new Map will be used as the cache.
 */
export class FallbackCacheStore<T, K = string> extends CacheStore<T, K> {
  #store: Store<T, K>;
  #cache: Store<T, K>;

  constructor(opts: CacheStoreOptions<T, K>) {
    super(opts);
    this.#store = opts.store;
    this.#cache = opts.cache || new Map<K, T>();
  }

  /**
   * Retrieves a value from the cache or store.
   * If the value is found in the store, it is cached and returned.
   * If the value is not found in the store, it is retrieved from the cache.
   * If the value is found in the cache, it is returned.
   * If the value is not found in the cache, a cache miss event is emitted.
   * @param key - The key to retrieve the value for.
   * @returns {Promise<T | undefined>} - A promise that resolves to the value
   *                                     associated with the key, or undefined
   *                                     if the key does not exist in the cache
   *                                     or store.
   *
   * @fires CacheEvents#cache:hit - Emitted when a value is found in the cache.
   * @fires CacheEvents#cache:miss - Emitted when a value is not found in the cache.
   * @fires CacheEvents#cache:set - Emitted when a value is set in the cache.
   */
  async get(key: K): Promise<T | undefined> {
    let value = await this.#store.get(key);

    if (value === undefined) {
      value = await this.#cache.get(key);
      if (value !== undefined) {
        this.emit('cache:hit', key, value);
      } else {
        this.emit('cache:miss', key);
      }
    } else {
      this.#cache.set(key, value);
      this.emit('cache:set', key, value);
    }

    return value;
  }
}
