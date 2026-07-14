import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  assertAllowed(input: {
    key: string;
    scope: string;
    maxRequests: number;
    windowMs: number;
  }) {
    const now = Date.now();
    const bucketKey = `${input.scope}:${input.key}`;
    const current = this.buckets.get(bucketKey);

    if (current == null || current.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + input.windowMs });
      this.cleanup(now);
      return;
    }

    if (current.count >= input.maxRequests) {
      throw new HttpException("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
  }

  private cleanup(now: number) {
    if (this.buckets.size < 1_000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
