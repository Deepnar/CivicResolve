# Redis Caching System for CivicResolve

This comprehensive guide explains how to set up and use the enterprise-grade Redis caching system in CivicResolve for optimal performance and debugging visibility.

## 🚀 What is Redis Caching in CivicResolve?

CivicResolve implements a sophisticated Redis-based caching system that provides:
- **Enterprise-grade performance**: 5-30x faster API response times
- **Intelligent cache invalidation**: Multi-pattern cache invalidation ensuring data freshness
- **Comprehensive logging**: Detailed console logging for cache operations and debugging
- **Smart key management**: Advanced key pattern matching for precise cache invalidation
- **Production-ready architecture**: Connection pooling, retry logic, and graceful degradation

## 📊 Performance Benefits

With Redis caching enabled, you can expect:
- **🚀 5-30x faster** API response times for cached data (100ms → 3-10ms typical)
- **📉 70-90% reduction** in database queries for frequently accessed endpoints
- **🎯 Smart invalidation** - only affected cache keys are cleared, maintaining performance
- **🛡️ Graceful fallback** - application continues functioning if Redis is unavailable
- **👁️ Complete visibility** - detailed logging shows exactly when cache is hit/miss/invalidated

## 🔧 Installation Options

### Option 1: Local Redis (Development)

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### On macOS:
```bash
# Using Homebrew
brew install redis
brew services start redis
```

#### On Windows:
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Or use WSL2 with Ubuntu instructions

### Option 2: Docker (Recommended for Development)

```bash
# Run Redis in Docker
docker run -d \
  --name redis-civicresolve \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes

# To stop
docker stop redis-civicresolve

# To start again
docker start redis-civicresolve
```

### Option 3: Cloud Redis (Production)

Popular cloud Redis providers:
- **Redis Cloud** (free tier available)
- **AWS ElastiCache**
- **Google Cloud Memorystore**
- **DigitalOcean Managed Databases**

## Configuration

### 1. Environment Setup

Copy `.env.example` to `.env.local` and configure Redis:

```bash
# For local Redis
REDIS_URL=redis://localhost:6379

# For Redis with password
REDIS_URL=redis://username:password@hostname:port

# For Redis Cloud
REDIS_URL=redis://default:your_password@your-endpoint:port
```

### 2. Verify Redis Connection

Test your Redis connection:

```bash
# Test local Redis
redis-cli ping
# Should return: PONG

# Test Redis URL
redis-cli -u redis://localhost:6379 ping
```

### 3. Optional: Redis Configuration

Create `/etc/redis/redis.conf` for custom settings:

```conf
# Memory settings
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (optional for cache-only usage)
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_secure_password
```

## Environment Variables

All Redis configuration is handled through environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REDIS_URL` | Redis connection URL | none | `redis://localhost:6379` |
| `REDIS_MAX_RETRIES` | Connection retry attempts | 3 | `5` |
| `REDIS_RETRY_DELAY` | Retry delay in ms | 100 | `200` |

## 🎯 Cache System Architecture

### Advanced Cache Implementation

CivicResolve implements a sophisticated multi-pattern cache invalidation system:

```typescript
// lib/server-cache.ts - Core cache implementation
export async function serverCacheInvalidate(tags: string[]) {
  const patterns = [
    ...tags.map(tag => `${tag}*`),        // Keys starting with tag
    ...tags.map(tag => `*${tag}*`),       // Keys containing tag  
    ...tags.map(tag => `*${tag}`)         // Keys ending with tag
  ]
  
  let totalInvalidated = 0
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
      totalInvalidated += keys.length
      console.log(`🧹 [CACHE] Invalidated ${keys.length} keys matching: ${pattern}`)
    }
  }
  
  console.log(`✅ [CACHE] Total invalidated: ${totalInvalidated} keys`)
  return totalInvalidated
}
```

### Cache Behavior & Logging

#### What Gets Cached
- **📋 Issues API**: Filtered issue lists with 5-minute TTL
- **👥 Users API**: User lists with statistics (5 min TTL)  
- **📊 Analytics API**: Dashboard metrics (5 min TTL)
- **🤖 Chat AI**: AI responses for general queries (30 min TTL)
- **📈 Platform Stats**: Counts and aggregated data (5 min TTL)

#### Smart Cache Invalidation Triggers
- **🆕 New Issue Created**: Invalidates `['issues', 'stats', 'analytics']`
- **🔄 Status Updates**: Invalidates `['issues', 'stats', 'analytics']`
- **👍 Vote Changes**: Invalidates `['issues', 'stats']`
- **💬 Comment Addition**: Invalidates `['issues', 'comments']`
- **👤 Issue Assignment**: Invalidates `['issues', 'stats', 'analytics']`

#### 📊 Real-Time Cache Monitoring

When you run the application, you'll see detailed cache operation logs:

```bash
# Cache Hit (Serving Cached Data)
✅ [CACHE] CACHE HIT for key: issues:all:all:newest:1:[]
⚡ [GET] Serving cached data (Age: 45s, Size: ~8.5KB)

# Cache Miss (Fetching Fresh Data)
❌ [CACHE] CACHE MISS for key: issues:all:all:newest:1:[]
🏃 [GET] Cache miss - fetching fresh data from database
📊 [GET] Database query returned 25 issues
💾 [CACHE] Storing data (TTL: 300s, Size: ~8.5KB)

# Cache Invalidation (Data Changed)
🆕 [POST] New issue created with ID: 456
🗑️ [POST] **CACHE INVALIDATION TRIGGERED** - New issue created
🎯 [POST] About to invalidate cache tags: ['issues', 'stats', 'analytics']
🧹 [CACHE] Invalidated 12 keys matching patterns
✅ [POST] Cache invalidation completed - fresh data will be fetched
```

### Cache Keys Structure

CivicResolve uses structured, predictable cache keys:

```typescript
// Examples of cache keys used in the system
"issues:all:all:newest:1:[]"           // Issues list: category:status:sort:page:priorities
"issues:ROADS:PENDING:newest:1:[]"     // Filtered issues
"users:stats:active"                   // User statistics
"analytics:dashboard:overview"         // Dashboard analytics
"chat:context:general"                 // AI chat responses
"stats:issues:total"                   // Platform statistics
```

### Environment Variables

All Redis configuration is handled through environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REDIS_URL` | Redis connection URL | none | `redis://localhost:6379` |
| `REDIS_HOST` | Redis server host | `localhost` | `redis.example.com` |
| `REDIS_PORT` | Redis server port | `6379` | `6380` |
| `REDIS_PASSWORD` | Redis authentication | none | `your_secure_password` |
| `REDIS_MAX_RETRIES` | Connection retry attempts | `3` | `5` |
| `REDIS_RETRY_DELAY` | Retry delay in ms | `100` | `200` |
| `ENABLE_CACHE_LOGGING` | Detailed cache logs | `false` | `true` |
| `CACHE_DEFAULT_TTL` | Default TTL in seconds | `300` | `600` |
- `issues:all:category:status:priority:limit:offset`
- `users:list:with_stats`
- `analytics:dashboard`
- `chat:ai:response:[hash]`
- `stats:platform`

## Monitoring

### Check Cache Performance

Monitor cache hits/misses in your application logs:

```bash
# View Redis info
redis-cli info stats

# Monitor cache operations
redis-cli monitor

# Check memory usage
redis-cli info memory
```

### Common Commands

```bash
# View all cache keys
redis-cli KEYS "*"

# Clear all cache (development only)
redis-cli FLUSHALL

# Check specific key
redis-cli GET "issues:all:all:all:all:50:0"

# Check key TTL
redis-cli TTL "analytics:dashboard"
```

## Production Considerations

### Security
- Use password authentication
- Configure firewall rules
- Use TLS/SSL for cloud connections
- Restrict Redis bind addresses

### Performance
- Set appropriate `maxmemory` limits
- Use `allkeys-lru` eviction policy
- Monitor memory usage
- Consider Redis cluster for high availability

### Backup
```bash
# Manual backup
redis-cli BGSAVE

# Check backup status
redis-cli LASTSAVE
```

## 🐛 Debugging & Troubleshooting

### Real-Time Cache Debugging

#### Enable Detailed Logging
```env
# Add to .env.local for comprehensive cache debugging
ENABLE_CACHE_LOGGING=true
```

#### Monitor Cache Operations Live
```bash
# Start your application and watch the console for cache operations:
npm run dev

# You'll see detailed logs like:
# 🔍 [CACHE] Looking for cache key: issues:all:all:newest:1:[]
# ❌ [CACHE] CACHE MISS for key: issues:all:all:newest:1:[]
# 💾 [CACHE] Storing data for key: issues:all:all:newest:1:[] (TTL: 300s)
```

#### Redis CLI Debugging Commands
```bash
# Connect to Redis CLI
redis-cli

# Check all cached keys
KEYS *

# Check specific pattern
KEYS issues:*

# Get cache content (for debugging)
GET "issues:all:all:newest:1:[]"

# Check TTL (time to live)
TTL "issues:all:all:newest:1:[]"

# Monitor real-time operations
MONITOR

# Check memory usage
INFO memory

# Check connected clients
CLIENT LIST
```

### Performance Testing & Monitoring

#### Compare Performance (With vs Without Cache)

**Test Cache Miss (First Request):**
```bash
# Clear cache first
redis-cli FLUSHALL

# Test API response time (will be slower)
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/issues
# Expected: 50-200ms (database query)
```

**Test Cache Hit (Second Request):**
```bash
# Same request (should be much faster)
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/issues
# Expected: 3-10ms (cache hit)
```

#### Cache Statistics Monitoring
```bash
# Get Redis statistics
redis-cli INFO stats

# Key metrics to monitor:
# - keyspace_hits: Number of cache hits
# - keyspace_misses: Number of cache misses
# - hit_rate = hits / (hits + misses) * 100
```

### Common Issues & Solutions

#### 1. **Cache Not Working (No Performance Improvement)**

**Symptoms:**
- No cache hit logs in console
- Every request shows "CACHE MISS"
- Response times consistently slow

**Diagnosis:**
```bash
# Check Redis connectivity
redis-cli ping
# Expected: PONG

# Check if Redis is accessible from Node.js
node -e "
const Redis = require('ioredis');
const redis = new Redis();
redis.ping().then(console.log).catch(console.error);
"
```

**Solutions:**
- Verify Redis is running: `sudo systemctl status redis-server`
- Check environment variables: `REDIS_HOST`, `REDIS_PORT`
- Verify firewall/security group settings
- Check Redis logs: `sudo journalctl -u redis-server`

#### 2. **Stale Data Issues (Cache Not Invalidating)**

**Symptoms:**
- New issues don't appear immediately
- Status updates not reflected
- Fresh data requires manual page refresh

**Diagnosis:**
```bash
# Check if invalidation is being triggered
# Look for logs like: "🗑️ **CACHE INVALIDATION TRIGGERED**"

# Check if keys are actually being deleted
redis-cli
KEYS issues:*  # Before invalidation
# ... create new issue ...
KEYS issues:*  # After invalidation (should be fewer/different keys)
```

**Solutions:**
- Verify cache invalidation patterns in console logs
- Check if `serverCacheInvalidate()` is being called after data changes
- Ensure proper tag usage: `['issues', 'stats', 'analytics']`

#### 3. **Memory Issues (Redis Running Out of Memory)**

**Symptoms:**
- Redis logs show memory warnings
- Cache hit ratio dropping
- Application performance degrading

**Diagnosis:**
```bash
# Check Redis memory usage
redis-cli INFO memory

# Check for memory policy
redis-cli CONFIG GET maxmemory-policy
```

**Solutions:**
```bash
# Set memory limit and eviction policy
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Or in redis.conf:
echo "maxmemory 256mb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
```

#### 4. **Connection Issues**

**Symptoms:**
- "Connection refused" errors
- Intermittent cache failures
- Application fallback to database-only mode

**Diagnosis:**
```bash
# Check Redis service status
sudo systemctl status redis-server

# Check port accessibility
sudo netstat -tlnp | grep :6379

# Test connection from application server
telnet localhost 6379
```

**Solutions:**
```bash
# Restart Redis service
sudo systemctl restart redis-server

# Check Redis configuration
sudo nano /etc/redis/redis.conf
# Ensure: bind 127.0.0.1 ::1 (for local) or 0.0.0.0 (for remote)

# Check firewall rules
sudo ufw status
sudo ufw allow 6379  # If needed for remote access
```

### Production Optimization

#### Memory Management
```bash
# Recommended Redis configuration for production
maxmemory 1gb                    # Adjust based on available RAM
maxmemory-policy allkeys-lru     # Evict least recently used keys
tcp-keepalive 300               # Connection health checks
timeout 300                     # Client connection timeout
```

#### Performance Tuning
```bash
# Disable slow operations in production
save ""                         # Disable RDB snapshots for pure cache
appendonly no                   # Disable AOF for pure cache usage

# Or enable persistence for important cache
save 900 1                      # Save every 15min if 1+ keys changed
appendonly yes                  # Enable append-only file
appendfsync everysec           # Sync every second
```

#### Monitoring & Alerts
```bash
# Monitor key metrics
redis-cli --latency-history     # Track latency over time
redis-cli --bigkeys            # Find memory-heavy keys
redis-cli --memkeys            # Memory usage by key pattern

# Set up alerts for:
# - Memory usage > 80%
# - Hit ratio < 70%
# - Connection count > 100
# - Latency > 10ms average
```

### Troubleshooting

### Common Issues

1. **Connection refused**
   ```bash
   # Check if Redis is running
   sudo systemctl status redis-server
   
   # Check port availability
   sudo netstat -tlnp | grep :6379
   ```

2. **Memory issues**
   ```bash
   # Check memory usage
   redis-cli info memory
   
   # Clear cache if needed
   redis-cli FLUSHALL
   ```

3. **Permission denied**
   ```bash
   # Check Redis config
   sudo nano /etc/redis/redis.conf
   
   # Restart Redis
   sudo systemctl restart redis-server
   ```

### Fallback Behavior

If Redis is unavailable, CivicResolve will:
- Continue operating normally
- Skip caching operations
- Log warnings (not errors)
- Performance will be slower but functional

## Performance Testing

Test cache performance with Redis enabled vs disabled:

```bash
# Test API response times
curl -w "%{time_total}" http://localhost:3000/api/issues

# Load test with Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/issues
```

## Getting Help

- Redis Documentation: https://redis.io/docs/
- CivicResolve Issues: Check GitHub repository
- Community Support: Redis Discord/Forums