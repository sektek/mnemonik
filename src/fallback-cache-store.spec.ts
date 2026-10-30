import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);
use(chaiAsPromised);

import { FallbackCacheStore } from './fallback-cache-store.js';

class AsyncMapStore<T, K = string> implements Store<T, K> {
  readonly entries = new Map<K, T>();
  failOnWrite = false;

  async #delay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5));
    if (this.failOnWrite) {
      throw new Error('cache write failed');
    }
  }

  async get(key: K): Promise<T | undefined> {
    await new Promise(resolve => setTimeout(resolve, 5));
    return this.entries.get(key);
  }

  async has(key: K): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 5));
    return this.entries.has(key);
  }

  async set(key: K, value: T): Promise<void> {
    await this.#delay();
    this.entries.set(key, value);
  }

  async delete(key: K): Promise<boolean> {
    await this.#delay();
    return this.entries.delete(key);
  }

  async clear(): Promise<void> {
    await this.#delay();
    this.entries.clear();
  }

  keys(): Iterable<K> {
    return this.entries.keys();
  }

  values(): Iterable<T> {
    return this.entries.values();
  }
}

describe('FallbackCacheStore', function () {
  let cacheStore: FallbackCacheStore<string, string>;
  let cache: Map<string, string>;
  let store: Map<string, string>;

  beforeEach(function () {
    store = new Map<string, string>();
    cache = new Map<string, string>();
    cacheStore = new FallbackCacheStore({
      store,
      cache,
    });
  });

  it('should return undefined for non-existent key', async function () {
    const value = await cacheStore.get('nonExistentKey');
    expect(value).to.be.undefined;
  });

  it('should return value from store before trying cache', async function () {
    store.set('key1', 'value1');
    const cacheSpy = sinon.spy(cache, 'get');

    const value = await cacheStore.get('key1');

    expect(value).to.equal('value1');
    expect(cacheSpy).to.not.have.been.called;
  });

  it('should return value from cache if not in store', async function () {
    cache.set('key2', 'value2');
    const storeSpy = sinon.spy(store, 'get');

    const value = await cacheStore.get('key2');

    expect(value).to.equal('value2');
    expect(storeSpy).to.have.been.calledWith('key2');
  });

  it('should cache value from store', async function () {
    store.set('key3', 'value3');
    expect(cache.has('key3')).to.be.false;

    const value = await cacheStore.get('key3');

    expect(value).to.equal('value3');
    expect(cache.get('key3')).to.equal('value3');
  });

  it('should emit cache:hit when value is found in cache', async function () {
    cache.set('key4', 'value4');
    const listener = sinon.fake();
    cacheStore.on('cache:hit', listener);

    await cacheStore.get('key4');

    expect(listener).to.have.been.calledOnceWith('key4', 'value4');
  });

  it('should emit cache:miss when value is not found in cache or store', async function () {
    const listener = sinon.fake();
    cacheStore.on('cache:miss', listener);

    await cacheStore.get('missingKey');

    expect(listener).to.have.been.calledOnceWith('missingKey');
  });

  it('should emit cache:set when value is set in cache', async function () {
    const listener = sinon.fake();
    cacheStore.on('cache:set', listener);
    store.set('key1', 'value1');

    await cacheStore.get('key1');

    expect(listener).to.have.been.calledOnceWith('key1', 'value1');
    expect(cache.get('key1')).to.equal('value1');
  });

  describe('with the default cache', function () {
    let defaultCacheStore: FallbackCacheStore<string, string>;

    beforeEach(function () {
      defaultCacheStore = new FallbackCacheStore({ store });
    });

    it('should remove values cached by get when cleared', async function () {
      store.set('key1', 'value1');
      await defaultCacheStore.get('key1');
      store.delete('key1');
      expect(await defaultCacheStore.get('key1')).to.equal('value1');

      await defaultCacheStore.clear();

      expect(await defaultCacheStore.get('key1')).to.be.undefined;
    });

    it('should remove values cached by get when deleted', async function () {
      store.set('key1', 'value1');
      await defaultCacheStore.get('key1');

      await defaultCacheStore.delete('key1');

      expect(await defaultCacheStore.get('key1')).to.be.undefined;
    });
  });

  describe('with an asynchronous cache', function () {
    let asyncCache: AsyncMapStore<string, string>;
    let asyncCacheStore: FallbackCacheStore<string, string>;

    beforeEach(function () {
      asyncCache = new AsyncMapStore<string, string>();
      asyncCacheStore = new FallbackCacheStore<string, string>({
        store,
        cache: asyncCache,
      });
    });

    it('should emit cache:hit with the value, not a promise', async function () {
      asyncCache.entries.set('key1', 'value1');
      const listener = sinon.fake();
      asyncCacheStore.on('cache:hit', listener);

      await asyncCacheStore.get('key1');

      expect(listener).to.have.been.calledOnceWith('key1', 'value1');
    });

    it('should emit cache:set only after the cache contains the key', async function () {
      store.set('key1', 'value1');
      const present: boolean[] = [];
      asyncCacheStore.on('cache:set', key =>
        present.push(asyncCache.entries.has(key)),
      );

      await asyncCacheStore.get('key1');

      expect(present).to.deep.equal([true]);
    });

    it('should reject get when the cache write fails', async function () {
      store.set('key1', 'value1');
      asyncCache.failOnWrite = true;

      await expect(asyncCacheStore.get('key1')).to.be.rejectedWith(
        'cache write failed',
      );
    });
  });
});
