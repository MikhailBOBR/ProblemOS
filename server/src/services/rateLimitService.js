function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
}

export function createRateLimiter({ windowMs = 60_000, apiLimit = 240, authLimit = 20 } = {}) {
  const buckets = new Map();

  return function checkRateLimit(req, url) {
    if (!url.pathname.startsWith("/api/") || url.pathname === "/api/health") {
      return null;
    }

    const now = Date.now();
    const isAuth = url.pathname.startsWith("/api/auth/");
    const limit = isAuth ? authLimit : apiLimit;
    const key = `${getClientIp(req)}:${isAuth ? "auth" : "api"}`;
    const bucket = buckets.get(key) ?? { resetAt: now + windowMs, count: 0 };

    if (bucket.resetAt <= now) {
      bucket.resetAt = now + windowMs;
      bucket.count = 0;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      return { retryAfter, limit };
    }

    return null;
  };
}
