-- AlterTable
ALTER TABLE "RiotAccount" ADD COLUMN     "summonerLevel" INTEGER;

-- CreateTable
CREATE TABLE "RiotLinkAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "summonerId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "expectedIconId" INTEGER NOT NULL,
    "originalIconId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiotLinkAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiotLinkAttempt_userId_key" ON "RiotLinkAttempt"("userId");

-- CreateIndex
CREATE INDEX "RiotLinkAttempt_expiresAt_idx" ON "RiotLinkAttempt"("expiresAt");

-- AddForeignKey
ALTER TABLE "RiotLinkAttempt" ADD CONSTRAINT "RiotLinkAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
