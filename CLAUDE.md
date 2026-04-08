# CLAUDE.md — @sektek/mnemonik

Storage library for `@sektek/synaptik`. Currently implements caching abstractions — `CacheStore` (read-through) and `FallbackCacheStore` (store-first fallback) — with broader storage patterns planned.

## Commands

```bash
npm run build        # Compile (tsc -p tsconfig.build.json)
npm test             # Run all tests (mocha + tsx/esm)
npm run test:cover   # Coverage via c8

# Single test file:
npx mocha --import tsx/esm src/path/to/file.spec.ts
```

## Source layout

```
src/
  types/
    cache-events.ts     # CacheEvents type definition
  cache-store.ts        # Read-through cache
  fallback-cache-store.ts  # Store-first fallback cache
  *.spec.ts             # Tests co-located with source
```

## Classes

Both classes extend `EventEmitter` and implement `EventEmittingService<CacheEvents<T, K>>`. Both accept any `Store<T, K>` implementation (from utility-belt) for both the underlying store and the cache layer.

### `CacheStore<T, K = string>`

**Read-through cache** — cache is checked first; store is only consulted on a miss, and its result is then cached.

**Options (`CacheStoreOptions<T, K>`):**

| Option | Default | Purpose |
|--------|---------|---------|
| `store` | required | Underlying data source (`Store<T, K>`) |
| `cache` | `new Map<K, T>()` | Cache layer (`Store<T, K>`) |

**Method behaviour:**

| Method | Behaviour |
|--------|-----------|
| `get(key)` | Cache hit → emit `cache:hit`, return value. Cache miss → emit `cache:miss`, fetch from store. If store returns a value → cache it, emit `cache:set`, return value. |
| `set(key, value)` | Write to store first, then cache. Emit `cache:set`. |
| `delete(key)` | Delete from store first. Only if that succeeds, delete from cache. Emit `cache:deleted`. |
| `has(key)` | Cache hit → return `true` immediately (short-circuit). Otherwise delegate to store. |
| `clear()` | Clear store, then clear cache. |

---

### `FallbackCacheStore<T, K = string>`

**Store-first fallback** — store is always consulted first; cache is used only when the store misses. Extends `CacheStore` and overrides `get` only.

**Options:** Same as `CacheStore`.

**Overridden `get(key)` behaviour:**

Store hit → cache the value, emit `cache:set`, return value.
Store miss → check cache. Cache hit → emit `cache:hit`. Cache miss → emit `cache:miss`. Return result.

All other methods (`set`, `delete`, `has`, `clear`) are inherited unchanged from `CacheStore`.

---

### Comparison

| | `CacheStore` | `FallbackCacheStore` |
|--|--|--|
| Primary source | Cache | Store |
| Store consulted | On cache miss | Always |
| Use case | Hot data, infrequent writes | Store is authoritative, cache is stale-safe backup |

## Events (`src/types/cache-events.ts`)

| Event | Payload | When |
|-------|---------|------|
| `cache:hit` | `(key, value)` | Value found in cache |
| `cache:miss` | `(key)` | Value not found in cache (or store) |
| `cache:set` | `(key, value)` | Value written to cache layer |
| `cache:deleted` | `(key)` | Value deleted from both layers |

## Testing

- Mocha BDD, Chai, `sinon-chai`
- `sinon.spy(object, 'method')` to verify call order between cache and store layers
- `sinon.fake()` for event listeners; assert with `.to.have.been.calledOnceWith()`
- Fresh `Map` instances created in `beforeEach` — no shared state between tests
- No external services required

## Key constraints

- No new dependencies without explicit approval
- ESM only; imports use `.js` extensions
- Depends on `@sektek/synaptik`, `@sektek/utility-belt`
- Any `Store<T, K>` implementation can be used for both `store` and `cache` options
