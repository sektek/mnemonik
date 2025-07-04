import { EventEmitter } from 'events';

import { EventEmittingService, Store } from '@sektek/utility-belt';

import { CacheEvents } from './types/index.js';

/**
 * Options for the CacheStore constructor.
 * @template T - The type of values stored in the cache.
 * @template K - The type of keys used to access the cache.
 *               Defaults to string.
 * @property {Store<T, K>} store - The underlying store to retrieve values from.
 * @property {Store<T, K>} [cache] - An optional cache store to use for caching values.
 *                                   If not provided, a new Map will be used as the cache.
 */
export type CacheStoreOptions<T, K = string> = {
  store: Store<T, K>;
  cache?: Store<T, K>;
};

/**
 * CacheStore is a read-through cache implementation that uses an underlying store
 * to retrieve values when they are not found in the cache.
 *
 * @template T - The type of values stored in the cache.
 * @template K - The type of keys used to access the cache. Defaults to string.
 */
export class CacheStore<T, K = string>
  extends EventEmitter
  implements EventEmittingService<CacheEvents<T, K>>
{
  #store: Store<T, K>;
  #cache: Store<T, K>;

  /**
   * Creates an instance of CacheStore.
   * @param {CacheStoreOptions<T, K>} opts - The options for the cache store.
   */
  constructor(opts: CacheStoreOptions<T, K>) {
    super();
    this.#store = opts.store;
    this.#cache = opts.cache || new Map<K, T>();
  }

  /**
   * Retrieves a value from the cache or store.
   * If the value is found in the cache, it is returned immediately.
   * If the value is not found in the cache, it is retrieved from the store,
   * cached, and then returned.
   * @param key - The key to retrieve the value for.
   * @returns {Promise<T | undefined>} - A promise that resolves to the value associated with the key,
   *                                      or undefined if the key does not exist in the cache or store.
   */
  async get(key: K): Promise<T | undefined> {
    if (await this.#cache.has(key)) {
      const value = this.#cache.get(key);
      this.emit('cache:hit', key, value);
      return value;
    }

    this.emit('cache:miss', key);

    const value = await this.#store.get(key);
    if (value !== undefined) {
      this.#cache.set(key, value);
      this.emit('cache:set', key, value);
    }
    return value;
  }

  /**
   * Sets a value in the cache and the underlying store.
   * @param key - The key to set the value for.
   * @param value - The value to set.
   * @returns {Promise<void>} - A promise that resolves when the value has been set.
   */
  async set(key: K, value: T): Promise<void> {
    await this.#store.set(key, value);
    this.#cache.set(key, value);
    this.emit('cache:set', key, value);
  }

  /**
   * Deletes a value from the cache and the underlying store.
   * @param key - The key to delete.
   * @returns {Promise<boolean>} - A promise that resolves to true if the value was deleted,
   *                                or false if it did not exist.
   */
  async delete(key: K): Promise<boolean> {
    const deleted = await this.#store.delete(key);
    if (deleted) {
      this.#cache.delete(key);
      this.emit('cache:deleted', key);
    }
    return deleted;
  }

  async has(key: K): Promise<boolean> {
    if (await this.#cache.has(key)) {
      return true;
    }
    return this.#store.has(key);
  }

  async clear(): Promise<void> {
    await this.#store.clear();
    await this.#cache.clear();
  }
}
