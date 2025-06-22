// src/lib/prisma.js
import { PrismaClient } from '@prisma/client';

let prismaInstance; // Renamed to avoid confusion with global `prisma` if any

if (process.env.NODE_ENV === 'production') {
  prismaInstance = new PrismaClient();
} else {
  if (!global._prismaInstance) { // Use a more unique global variable name
    global._prismaInstance = new PrismaClient();
  }
  prismaInstance = global._prismaInstance;
}

export default prismaInstance;