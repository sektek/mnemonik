# Mnemonik

Data storage utilities for use with Synaptik. Currently it provides two caching layers that sit in front of any `Store` from `@sektek/utility-belt`:

| Class | Strategy | Use when |
|-------|----------|----------|
| `CacheStore` | Read-through: check the cache first, fall back to the store on a miss | The store is slower than the cache and values rarely change behind your back |
| `FallbackCacheStore` | Store-first: always ask the store, use the cache only if the store has nothing | The store is authoritative and the cache is a stale-safe backup |

## Installation

```sh
npm install @sektek/mnemonik
```

## Stores

Both classes work with the `Store<T, K>` interface from `@sektek/utility-belt` (`get`, `set`, `delete`, `has`, `clear`, and iteration). A plain `Map` satisfies it, as does any other store, such as the Redis store in `@sektek/mnemonik-redis`. Methods may be synchronous or return promises.

Keys default to `string`; pass a second type argument for other key types.

## `CacheStore`

A read-through cache. Reads hit the cache first; only a miss goes to the underlying store, and the result is cached for next time.

```ts
import { CacheStore } from '@sektek/mnemonik';

const store = new CacheStore<User>({
  store: userRepositoryStore, // any Store<User>
  cache: new Map(), // optional, this is the default
});

const user = await store.get('user-1'); // miss: loaded from userRepositoryStore, then cached
const again = await store.get('user-1'); // hit: served from the cache
```

| Option | Default | Description |
|--------|---------|-------------|
| `store` | required | The underlying data source. |
| `cache` | new `Map` | The cache layer. Any `Store<T, K>`. |

| Method | Behaviour |
|--------|-----------|
| `get(key)` | Cache hit returns the cached value. On a miss the value is fetched from the store; if found it is cached and returned, otherwise `undefined`. |
| `set(key, value)` | Writes to the store first, then the cache. |
| `delete(key)` | Deletes from the store. Only if the store reports a deletion is the entry removed from the cache. Resolves to the store's result. |
| `has(key)` | `true` immediately if the cache has the key, otherwise asks the store. |
| `clear()` | Clears the store, then the cache. |

> `get` does not cache an `undefined` result, so repeated lookups of a missing key reach the store every time.

## `FallbackCacheStore`

A store-first cache. Reads always ask the store first, and each value found is copied into the cache. The cache is only read when the store has no value, which keeps serving the last known value while the store is empty or unavailable for that key.

```ts
import { FallbackCacheStore } from '@sektek/mnemonik';

const cache = new Map<string, Config>();
const store = new FallbackCacheStore<Config>({
  store: remoteConfigStore,
  cache,
});

const config = await store.get('app'); // store hit: returned and copied into the cache
// later, if remoteConfigStore no longer has 'app'
const fallback = await store.get('app'); // store miss: the cached copy is returned
```

It takes the same options as `CacheStore` and extends it, overriding only `get`. `set`, `delete`, `has`, and `clear` behave exactly as described for `CacheStore`.

## Events

Both classes are `EventEmitter`s and emit these events:

| Event | Arguments | When |
|-------|-----------|------|
| `cache:hit` | `key, value` | A value was served from the cache. |
| `cache:miss` | `key` | No value was found in the cache. For `FallbackCacheStore`, only when the store also had none. |
| `cache:set` | `key, value` | A value was written to the cache, by `get` or `set`. |
| `cache:deleted` | `key` | A key was deleted. |

```ts
store.on('cache:hit', key => metrics.increment('cache.hit', { key }));
store.on('cache:miss', key => metrics.increment('cache.miss', { key }));
```

`CacheEvents<T, K>` is exported for typing listeners.

## Choosing between them

- Use **`CacheStore`** to avoid repeated trips to a slow store. Writes made directly to the store, bypassing the cache, are not seen once the key is cached, because there is no expiry; call `delete` or `clear` to refresh.
- Use **`FallbackCacheStore`** when the store must always be the source of truth and you want a last-known-good copy if it returns nothing. It reads the store on every `get`, so it does not reduce load on it.
