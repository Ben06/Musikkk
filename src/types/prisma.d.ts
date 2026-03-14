import '@prisma/client';

declare module '@prisma/client' {
  namespace Prisma {
    const sql: any; // or a more specific type if you prefer
  }
}