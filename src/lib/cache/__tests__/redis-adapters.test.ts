import { describe, expect, mock, test } from 'bun:test'

import { IoRedisAdapter, NoopAdapter } from '../redis-client'

describe('NoopAdapter', () => {
  test('get returns null', async () => {
    const adapter = new NoopAdapter()
    expect(await adapter.get('key')).toBeNull()
  })

  test('set is a no-op', async () => {
    const adapter = new NoopAdapter()
    await adapter.set('key', 'value', 300)
    expect(await adapter.get('key')).toBeNull()
  })

  test('del is a no-op', async () => {
    const adapter = new NoopAdapter()
    await adapter.del('key')
  })
})

describe('IoRedisAdapter', () => {
  test('can be constructed', () => {
    const adapter = new IoRedisAdapter('redis://localhost:16379')
    expect(adapter).toBeDefined()
  })

  test('get uses injected createClient and returns data', async () => {
    const mockClient = {
      get: mock(async () => 'cached-value'),
      set: mock(async () => 'OK'),
      del: mock(async () => 1),
    }
    const adapter = new IoRedisAdapter(
      'redis://localhost:6379',
      async () => mockClient as unknown as import('ioredis').default,
    )

    const result = await adapter.get('my-key')
    expect(result).toBe('cached-value')
    expect(mockClient.get).toHaveBeenCalledWith('my-key')
  })

  test('get returns null when client returns null', async () => {
    const mockClient = {
      get: mock(async () => null),
      set: mock(async () => 'OK'),
      del: mock(async () => 1),
    }
    const adapter = new IoRedisAdapter(
      'redis://localhost:6379',
      async () => mockClient as unknown as import('ioredis').default,
    )

    const result = await adapter.get('missing')
    expect(result).toBeNull()
  })

  test('set calls client.set with EX flag', async () => {
    const mockClient = {
      get: mock(async () => null),
      set: mock(async () => 'OK'),
      del: mock(async () => 1),
    }
    const adapter = new IoRedisAdapter(
      'redis://localhost:6379',
      async () => mockClient as unknown as import('ioredis').default,
    )

    await adapter.set('key1', 'value1', 300)
    expect(mockClient.set).toHaveBeenCalledWith('key1', 'value1', 'EX', 300)
  })

  test('del calls client.del with correct key', async () => {
    const mockClient = {
      get: mock(async () => null),
      set: mock(async () => 'OK'),
      del: mock(async () => 1),
    }
    const adapter = new IoRedisAdapter(
      'redis://localhost:6379',
      async () => mockClient as unknown as import('ioredis').default,
    )

    await adapter.del('key1')
    expect(mockClient.del).toHaveBeenCalledWith('key1')
  })

  test('reuses client across multiple calls', async () => {
    let createCalls = 0
    const mockClient = {
      get: mock(async () => 'val'),
      set: mock(async () => 'OK'),
      del: mock(async () => 1),
    }
    const adapter = new IoRedisAdapter(
      'redis://localhost:6379',
      async () => {
        createCalls++
        return mockClient as unknown as import('ioredis').default
      },
    )

    await adapter.get('a')
    await adapter.get('b')
    await adapter.set('c', 'v', 60)
    expect(createCalls).toBe(1)
  })
})
