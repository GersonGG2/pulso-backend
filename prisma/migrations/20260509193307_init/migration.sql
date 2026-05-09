-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ORGANIZER', 'ADMIN', 'OPERATOR', 'SCOUT');

-- CreateEnum
CREATE TYPE "LolRole" AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');

-- CreateEnum
CREATE TYPE "PlayerTier" AS ENUM ('AMATEUR', 'COMPETIDOR', 'SEMI_PRO', 'PRO');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('STARTER', 'SUBSTITUTE', 'COACH', 'MANAGER');

-- CreateEnum
CREATE TYPE "Game" AS ENUM ('LEAGUE_OF_LEGENDS');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN', 'SWISS', 'GROUP_STAGE_PLAYOFFS');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('SOLO_1V1', 'TEAM_5V5', 'ARAM');

-- CreateEnum
CREATE TYPE "BracketType" AS ENUM ('SEEDED', 'RANDOM', 'POD_BASED');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'WITHDRAWN', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'CODE_GENERATED', 'IN_LOBBY', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ZScoreSource" AS ENUM ('MATCH_RESULT', 'TOURNAMENT_PLACEMENT', 'PERFORMANCE_BONUS', 'STREAK_MULTIPLIER', 'INACTIVITY_DECAY', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('PRO_PLAYER', 'RECRUITER_ACCESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiotAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "summonerId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "tagLine" TEXT NOT NULL,
    "highestRankEver" TEXT,
    "currentTier" TEXT,
    "currentRank" TEXT,
    "currentLP" INTEGER,
    "smsVerified" BOOLEAN NOT NULL DEFAULT false,
    "smsVerifiedAt" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiotAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryRole" "LolRole",
    "secondaryRole" "LolRole",
    "country" TEXT NOT NULL,
    "city" TEXT,
    "birthDate" TIMESTAMP(3),
    "zScore" INTEGER NOT NULL DEFAULT 1500,
    "zScoreVolatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "zScoreDeviation" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "tier" "PlayerTier" NOT NULL DEFAULT 'AMATEUR',
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "proExpiresAt" TIMESTAMP(3),
    "recruitable" BOOLEAN NOT NULL DEFAULT true,
    "recruitablePrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "logoUrl" TEXT,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "rfc" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "website" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "payoutMethodEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "organizerId" TEXT NOT NULL,
    "game" "Game" NOT NULL DEFAULT 'LEAGUE_OF_LEGENDS',
    "format" "TournamentFormat" NOT NULL,
    "modality" "Modality" NOT NULL,
    "bracketType" "BracketType" NOT NULL,
    "minTier" "PlayerTier",
    "maxTier" "PlayerTier",
    "region" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "entryFeeMxnCents" INTEGER NOT NULL DEFAULT 0,
    "prizePoolJson" JSONB,
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "rulesetVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "bracketPosition" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "riotMatchId" TEXT,
    "tournamentCode" TEXT,
    "riotProviderId" INTEGER,
    "riotTournamentId" INTEGER,
    "winnerSide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "role" "LolRole",
    "championPlayed" TEXT,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "cs" INTEGER,
    "visionScore" INTEGER,
    "goldEarned" INTEGER,
    "damageDealt" INTEGER,
    "goldDiff15" INTEGER,
    "csPerMin" DOUBLE PRECISION,
    "win" BOOLEAN,
    "zScoreDelta" INTEGER,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZScoreEvent" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "source" "ZScoreSource" NOT NULL,
    "delta" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "matchId" TEXT,
    "tournamentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RiotAccount_userId_key" ON "RiotAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RiotAccount_puuid_key" ON "RiotAccount"("puuid");

-- CreateIndex
CREATE INDEX "RiotAccount_puuid_idx" ON "RiotAccount"("puuid");

-- CreateIndex
CREATE INDEX "RiotAccount_region_idx" ON "RiotAccount"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE INDEX "Player_zScore_idx" ON "Player"("zScore");

-- CreateIndex
CREATE INDEX "Player_tier_idx" ON "Player"("tier");

-- CreateIndex
CREATE INDEX "Player_country_primaryRole_idx" ON "Player"("country", "primaryRole");

-- CreateIndex
CREATE INDEX "Player_recruitable_tier_idx" ON "Player"("recruitable", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tag_key" ON "Team"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_playerId_key" ON "TeamMember"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_userId_key" ON "Organizer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_region_status_idx" ON "Tournament"("region", "status");

-- CreateIndex
CREATE INDEX "Tournament_startsAt_idx" ON "Tournament"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_playerId_key" ON "TournamentRegistration"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_teamId_key" ON "TournamentRegistration"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_scheduledAt_idx" ON "Match"("scheduledAt");

-- CreateIndex
CREATE INDEX "Match_riotMatchId_idx" ON "Match"("riotMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_playerId_key" ON "MatchParticipant"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "ZScoreEvent_playerId_createdAt_idx" ON "ZScoreEvent"("playerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubId_key" ON "Subscription"("providerSubId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "RiotAccount" ADD CONSTRAINT "RiotAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organizer" ADD CONSTRAINT "Organizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZScoreEvent" ADD CONSTRAINT "ZScoreEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
