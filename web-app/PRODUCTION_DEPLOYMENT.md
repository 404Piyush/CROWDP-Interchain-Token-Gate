# Production Deployment Guide

This guide outlines the security measures implemented and configuration requirements for deploying the Cosmos Token Verifier to production.

## Security Measures Implemented

### 🔐 Authentication & Authorization

#### 1. Secure Session-Based Authentication
- **Implementation**: `src/app/lib/session-manager.ts`
- **Security**: Session tokens prevent wallet address exposure in URLs
- **Flow**: Wallet address creates secure session before OAuth
- **Verification**: Server-side session validation with expiration

#### 2. OAuth State Security & PKCE
- **CSRF Protection**: Cryptographically secure, single-use state tokens
- **PKCE**: Proof Key for Code Exchange implemented for authorization code flow
- **Storage**: OAuth states stored in MongoDB with expiration
- **Verification**: State validation on callback with automatic cleanup

#### 3. Admin Access Control
- **API Protection**: All admin endpoints require authentication
- **Methods**: API key authentication + admin role verification
- **Endpoints**: `/api/roles` (POST), `/api/test-role` (POST)

### 🛡️ Data Security

#### 4. Discord Token Encryption
- **Implementation**: `src/app/lib/encryption.ts`
- **Algorithm**: AES-256-GCM encryption
- **Storage**: Encrypted tokens stored in MongoDB
- **Key Management**: Server-held encryption keys

#### 5. Server-Side Balance Verification
- **Source**: Direct blockchain queries via Cosmos REST API
- **Fallback**: Cached balances only when blockchain unavailable
- **Updates**: Real-time balance fetching for role computations
- **Prevention**: Eliminates client-side balance manipulation

### 🚦 Rate Limiting & Security Headers

#### 6. Comprehensive Rate Limiting
- **Implementation**: `src/app/lib/rate-limiter.ts`
- **Tiers**: Different limits for auth, role assignment, and general endpoints
- **Storage**: In-memory with Redis recommendation for production
- **Headers**: Standard rate limit headers included

#### 7. Security Headers & CORS
- **Implementation**: `src/lib/security-headers.ts`
- **Headers**: XSS protection, content type options, frame options
- **CORS**: Strict origin control with credentials support
- **Cache Control**: No-cache policies for sensitive endpoints

## Environment Configuration

### Required Environment Variables

```env
# Database
MONGODB_URI=mongodb://your-production-mongodb-uri

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_GUILD_ID=your_discord_server_id

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_BOT_API_KEY=your_secure_api_key
DISCORD_BOT_URL=https://your-bot-server.com

# Application
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your_secure_nextauth_secret

# Encryption
ENCRYPTION_KEY=your_32_byte_encryption_key

# Admin Access
ADMIN_API_KEY=your_admin_api_key
ADMIN_DISCORD_ROLE_ID=your_admin_role_id
```

### Critical Configuration Updates

#### 1. Discord Bot URL Configuration
Update the following files to use production bot URL:
- `src/app/api/test-role/route.ts`
- `src/app/api/auth/unlink/route.ts`
- `src/app/api/user/role/route.ts`
- `src/app/api/auth/discord/callback/route.ts`
- `src/app/api/user/save/route.ts`

**Current**: `process.env.DISCORD_BOT_URL || 'http://localhost:8000'`
**Production**: Set `DISCORD_BOT_URL=https://your-bot-server.com`

#### 2. CORS Configuration
Update `src/lib/security-headers.ts`:
```typescript
response.headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL);
```

#### 3. Rate Limiting Storage
For production, replace in-memory storage with Redis:
```typescript
// In src/app/lib/rate-limiter.ts
// Replace Map with Redis client for distributed rate limiting
```

## Deployment Checklist

### Pre-Deployment Security Audit
- [ ] All environment variables configured
- [ ] Discord bot permissions verified
- [ ] Database connection secured
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured for production load
- [ ] Admin access controls tested

### Infrastructure Requirements
- [ ] MongoDB cluster with replica sets
- [ ] Redis instance for rate limiting (recommended)
- [ ] Discord bot server with proper networking
- [ ] Load balancer with SSL termination
- [ ] Monitoring and logging infrastructure

### Security Verification
- [ ] ADR-36 signature verification working
- [ ] OAuth flow with PKCE functional
- [ ] Admin endpoints properly protected
- [ ] Balance verification from blockchain
- [ ] Token encryption/decryption working
- [ ] Rate limits enforced correctly

## Monitoring & Maintenance

### Security Monitoring
- Monitor failed authentication attempts
- Track rate limit violations
- Log admin access and role changes
- Monitor blockchain API availability
- Alert on encryption/decryption failures

### Regular Maintenance
- Rotate encryption keys periodically
- Update Discord bot permissions as needed
- Clean up expired OAuth states and nonces
- Monitor and optimize rate limiting thresholds
- Review and update security headers

## Threat Model

### Trust Boundaries
- **Trusted**: Cosmos blockchain, MongoDB, Discord API
- **Untrusted**: Client browsers, user inputs, external networks

### Attack Vectors Mitigated
1. **URL Privacy**: Session tokens prevent wallet address exposure in URLs
2. **OAuth CSRF**: Secure state tokens and PKCE
3. **Privilege Escalation**: Admin authentication on sensitive endpoints
4. **Balance Manipulation**: Server-side blockchain verification
5. **Token Theft**: Encryption at rest
6. **DoS Attacks**: Rate limiting and security headers

### Ongoing Security Considerations
- Keep dependencies updated
- Monitor for new attack vectors
- Regular security audits
- Penetration testing
- User education on wallet security

## Support & Documentation

### Additional Resources
- [Discord Developer Documentation](https://discord.com/developers/docs)
- [Cosmos SDK Documentation](https://docs.cosmos.network)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

### Emergency Contacts
- Maintain contact information for:
  - Database administrators
  - Discord server administrators
  - Infrastructure team
  - Security incident response team