import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

import { FallbackCacheStore } from './fallback-cache-store.js';

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
});
