# Redis Setup for Development

## Overview

This application uses Redis for distributed rate limiting in production. For development, the application will automatically fall back to in-memory rate limiting when Redis is not available.

## Development Setup (Optional)

If you want to test Redis functionality locally, you can set up Redis using one of the following methods:

### Option 1: Docker (Recommended)

```bash
# Run Redis in a Docker container
docker run -d --name redis-dev -p 6379:6379 redis:alpine

# To stop Redis
docker stop redis-dev

# To start Redis again
docker start redis-dev
```

### Option 2: Windows Installation

1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Install and run Redis
3. Redis will be available at `localhost:6379`

### Option 3: WSL (Windows Subsystem for Linux)

```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Test Redis
redis-cli ping
```

## Environment Configuration

Add to your `.env.local` file (optional):

```env
# Redis Configuration (optional for development)
REDIS_URL=redis://localhost:6379
```

## Production Setup

For production deployment, you'll need a Redis instance. Popular options include:

- **Redis Cloud**: https://redis.com/redis-enterprise-cloud/
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/
- **Google Cloud Memorystore**: https://cloud.google.com/memorystore
- **Azure Cache for Redis**: https://azure.microsoft.com/en-us/services/cache/

Set the `REDIS_URL` environment variable to your production Redis connection string.

## Fallback Behavior

When Redis is not available:
- The application automatically falls back to in-memory rate limiting
- Rate limits are maintained per server instance
- In development, Redis connection errors are minimized to reduce log noise
- The application continues to function normally

## Testing Rate Limiting

You can test the rate limiting functionality by making multiple requests to any API endpoint:

```bash
# Test with curl (adjust the URL as needed)
for i in {1..15}; do
  curl -X GET http://localhost:3000/api/roles
  echo "Request $i completed"
done
```

After exceeding the rate limit, you should receive a 429 status code with rate limit headers.