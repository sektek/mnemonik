import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

import { CacheStore } from './cache-store.js';

describe('ReadThroughCacheStore', function () {
  let cache: CacheStore<string, string>;
  let cacheStore: Map<string, string>;
  let dataStore: Map<string, string>;

  beforeEach(function () {
    dataStore = new Map<string, string>();
    cacheStore = new Map<string, string>();
    cache = new CacheStore<string, string>({
      store: dataStore,
      cache: cacheStore,
    });
  });

  it('should return undefined for non-existent keys', async function () {
    const value = await cache.get('non-existent');
    expect(value).to.be.undefined;
  });

  it('should emit cache:miss when key is not found in cache', async function () {
    const listener = sinon.fake();
    cache.on('cache:miss', listener);
    await cache.get('missing-key');
    expect(listener).to.have.been.calledOnceWith('missing-key');
  });

  it('should return value from store when cache is empty', async function () {
    dataStore.set('key1', 'value1');
    const spy = sinon.spy(cacheStore, 'set');

    const value = await cache.get('key1');

    expect(value).to.equal('value1');
    expect(spy).to.have.been.calledOnceWith('key1', 'value1');
  });

  it('should return value from cache when available', async function () {
    dataStore.set('key2', 'value2');
    const spy = sinon.spy(dataStore, 'get');

    await cache.get('key2');
    const value = await cache.get('key2');

    expect(value).to.equal('value2');
    expect(spy).to.have.been.calledOnceWith('key2');
  });

  it('should emit cache:hit when value is found in cache', async function () {
    dataStore.set('key3', 'value3');
    await cache.get('key3');
    const listener = sinon.fake();
    cache.on('cache:hit', listener);

    const value = await cache.get('key3');

    expect(value).to.equal('value3');
    expect(listener).to.have.been.calledOnceWith('key3', 'value3');
  });

  it('should set value in both cache and store', async function () {
    const spySetStore = sinon.spy(dataStore, 'set');
    const spySetCache = sinon.spy(cacheStore, 'set');

    await cache.set('key4', 'value4');

    expect(spySetStore).to.have.been.calledOnceWith('key4', 'value4');
    expect(spySetCache).to.have.been.calledOnceWith('key4', 'value4');
  });

  it('should emit cache:set when a value is set', async function () {
    const listener = sinon.fake();
    cache.on('cache:set', listener);

    await cache.set('key4', 'value4');

    expect(listener).to.have.been.calledOnceWith('key4', 'value4');
  });

  it('should delete value from both cache and store', async function () {
    dataStore.set('key5', 'value5');
    cacheStore.set('key5', 'value5');
    const spyDeleteStore = sinon.spy(dataStore, 'delete');
    const spyDeleteCache = sinon.spy(cacheStore, 'delete');

    const deleted = await cache.delete('key5');

    expect(deleted).to.be.true;
    expect(spyDeleteStore).to.have.been.calledOnceWith('key5');
    expect(spyDeleteCache).to.have.been.calledOnceWith('key5');
    expect(dataStore.has('key5')).to.be.false;
    expect(cacheStore.has('key5')).to.be.false;
  });

  it('should emit cache:deleted when a key is deleted', async function () {
    dataStore.set('key6', 'value6');
    cacheStore.set('key6', 'value6');
    const listener = sinon.fake();
    cache.on('cache:deleted', listener);

    await cache.delete('key6');

    expect(listener).to.have.been.calledOnceWith('key6');
  });

  it('should check existence in cache before store', async function () {
    cacheStore.set('key7', 'value7');
    const spyStoreHas = sinon.spy(dataStore, 'has');
    const exists = await cache.has('key7');
    expect(exists).to.be.true;
    expect(spyStoreHas).to.not.have.been.called;
  });

  it('should return false for non-existent keys', async function () {
    const exists = await cache.has('non-existent');
    expect(exists).to.be.false;
  });

  it('should clear both cache and store', async function () {
    dataStore.set('key8', 'value8');
    cacheStore.set('key8', 'value8');
    const spyClearStore = sinon.spy(dataStore, 'clear');
    const spyClearCache = sinon.spy(cacheStore, 'clear');

    await cache.clear();

    expect(spyClearStore).to.have.been.calledOnce;
    expect(spyClearCache).to.have.been.calledOnce;
    expect(dataStore.size).to.equal(0);
    expect(cacheStore.size).to.equal(0);
  });
});
