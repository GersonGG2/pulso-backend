-- AlterTable
ALTER TABLE "RiotAccount" ALTER COLUMN "summonerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RiotLinkAttempt" ALTER COLUMN "summonerId" DROP NOT NULL;
