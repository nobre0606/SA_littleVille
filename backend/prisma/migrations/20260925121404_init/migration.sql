-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrigemLocal" AS ENUM ('GPS', 'MANUAL');

-- CreateEnum
CREATE TYPE "TipoEmergencia" AS ENUM ('HOSPITAL', 'POLICIA', 'BOMBEIROS', 'DEFESA_CIVIL', 'ABRIGO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "telefone" TEXT NOT NULL,
    "cep" CHAR(8) NOT NULL,
    "numero" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'USER',
    "consentimentoLgpdEm" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posicaoLat" DOUBLE PRECISION,
    "posicaoLng" DOUBLE PRECISION,
    "posicaoPrecisaoM" DOUBLE PRECISION,
    "posicaoEm" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sightings" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "bairro" TEXT NOT NULL,
    "descricao" VARCHAR(500) NOT NULL DEFAULT '',
    "origemLocal" "OrigemLocal" NOT NULL,
    "precisaoM" DOUBLE PRECISION,
    "vistoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),
    "excluidoPorId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sightings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "codigo" CHAR(6) NOT NULL,
    "liderId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "entrouEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" VARCHAR(500) NOT NULL,
    "clientId" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_places" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoEmergencia" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefones" JSONB NOT NULL,
    "horario" TEXT NOT NULL,

    CONSTRAINT "emergency_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE INDEX "sightings_vistoEm_idx" ON "sightings"("vistoEm");

-- CreateIndex
CREATE INDEX "sightings_deletedAt_idx" ON "sightings"("deletedAt");

-- CreateIndex
CREATE INDEX "sightings_autorId_idx" ON "sightings"("autorId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_codigo_key" ON "teams"("codigo");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "messages_teamId_createdAt_idx" ON "messages"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_excluidoPorId_fkey" FOREIGN KEY ("excluidoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
