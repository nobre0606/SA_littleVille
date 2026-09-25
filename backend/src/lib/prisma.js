import { PrismaClient } from '@prisma/client'

/**
 * Uma única conexão (pool) com o banco para o servidor inteiro. Criar um PrismaClient por
 * requisição abriria conexões sem parar até estourar o limite do PostgreSQL.
 * A URL vem de DATABASE_URL (schema.prisma → env("DATABASE_URL")).
 */
export const prisma = new PrismaClient()
