const { PrismaClient } = require('@prisma/client');

/**
 * Shared Prisma singleton — one client per process.
 * Reused across all repositories to avoid connection pool exhaustion.
 */
const globalForPrisma = global;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
