-- CreateTable
CREATE TABLE "VisitStat" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitStat_pkey" PRIMARY KEY ("id")
);

-- Seed the single demo row used by getVisitStat.
INSERT INTO "VisitStat" ("id", "count") VALUES (1, 0);
