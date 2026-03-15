import { getRedisUrl } from '@/lib/env'

export interface RedisAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}

export class IoRedisAdapter implements RedisAdapter {
  private client: import('ioredis').default | null = null

  constructor(
    private url: string,
    private createClient?: () => Promise<import('ioredis').default>,
  ) {}

  private async getClient() {
    if (!this.client) {
      if (this.createClient) {
        this.client = await this.createClient()
      } else {
        const { default: Redis } = await import('ioredis')
        this.client = new Redis(this.url, {
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
        })
      }
    }
    return this.client
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient()
    return client.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const client = await this.getClient()
    await client.set(key, value, 'EX', ttlSeconds)
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient()
    await client.del(key)
  }
}

export class NoopAdapter implements RedisAdapter {
  async get(_key: string): Promise<string | null> {
    return null
  }
  async set(_key: string, _value: string, _ttlSeconds: number): Promise<void> {}
  async del(_key: string): Promise<void> {}
}

let instance: RedisAdapter | null = null

/** @internal Reset singleton for testing */
export function _resetRedisClient(): void {
  instance = null
}

export function getRedisClient(): RedisAdapter {
  if (instance) return instance

  const redisUrl = getRedisUrl()

  if (redisUrl) {
    instance = new IoRedisAdapter(redisUrl)
  } else {
    instance = new NoopAdapter()
  }

  return instance
}
