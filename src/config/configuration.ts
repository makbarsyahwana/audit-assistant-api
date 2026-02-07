export default () => ({
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiration: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
    refreshExpiration: parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '604800',
      10,
    ),
  },

  ragEngine: {
    url: process.env.RAG_ENGINE_URL || 'http://localhost:8001',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Phase 3: SSO / OIDC
  oidc: {
    enabled: process.env.OIDC_ENABLED === 'true',
    issuer: process.env.OIDC_ISSUER || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    callbackUrl:
      process.env.OIDC_CALLBACK_URL || 'http://localhost:8000/auth/oidc/callback',
    scope: process.env.OIDC_SCOPE || 'openid profile email',
    rolesClaim: process.env.OIDC_ROLES_CLAIM || 'roles',
    groupsClaim: process.env.OIDC_GROUPS_CLAIM || 'groups',
  },

  // Phase 3: SSO / SAML
  saml: {
    enabled: process.env.SAML_ENABLED === 'true',
    entryPoint: process.env.SAML_ENTRY_POINT || '',
    issuer: process.env.SAML_ISSUER || 'audit-assistant',
    cert: process.env.SAML_CERT || '',
    callbackUrl:
      process.env.SAML_CALLBACK_URL || 'http://localhost:8000/auth/saml/callback',
    roleAttribute: process.env.SAML_ROLE_ATTRIBUTE || 'Role',
    groupAttribute: process.env.SAML_GROUP_ATTRIBUTE || 'Group',
  },

  // Phase 3: Rate limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
    loginTtl: parseInt(process.env.THROTTLE_LOGIN_TTL || '60', 10),
    loginLimit: parseInt(process.env.THROTTLE_LOGIN_LIMIT || '5', 10),
  },

  // Phase 3: Secrets management
  secrets: {
    encryptionKey: process.env.SECRETS_ENCRYPTION_KEY || '',
    rotationIntervalDays: parseInt(
      process.env.SECRETS_ROTATION_INTERVAL_DAYS || '90',
      10,
    ),
  },
});
