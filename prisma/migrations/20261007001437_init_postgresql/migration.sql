-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "dataLcto" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mesNum" INTEGER NOT NULL,
    "mes" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subcategoria" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Realizado',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investimento" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataAtualizacao" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE INDEX "Lancamento_dataLcto_idx" ON "Lancamento"("dataLcto");

-- CreateIndex
CREATE INDEX "Lancamento_competencia_idx" ON "Lancamento"("competencia");

-- CreateIndex
CREATE INDEX "Lancamento_ano_mesNum_idx" ON "Lancamento"("ano", "mesNum");

-- CreateIndex
CREATE INDEX "Lancamento_natureza_idx" ON "Lancamento"("natureza");

-- CreateIndex
CREATE INDEX "Lancamento_grupo_idx" ON "Lancamento"("grupo");

-- CreateIndex
CREATE INDEX "Lancamento_responsavel_idx" ON "Lancamento"("responsavel");

-- CreateIndex
CREATE INDEX "Investimento_banco_idx" ON "Investimento"("banco");

-- CreateIndex
CREATE INDEX "Investimento_dataAtualizacao_idx" ON "Investimento"("dataAtualizacao");
