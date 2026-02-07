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
  },

  ragEngine: {
    url: process.env.RAG_ENGINE_URL || 'http://localhost:8001',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
});
