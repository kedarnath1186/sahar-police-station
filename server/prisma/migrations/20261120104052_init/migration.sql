-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Accused" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "detailedAddress" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "pincode" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "locationStatus" TEXT NOT NULL DEFAULT 'not_geocoded',
    "locationAccuracy" TEXT NOT NULL DEFAULT 'unknown',
    "geocodedQuery" TEXT NOT NULL DEFAULT '',
    "geocodedDisplayName" TEXT NOT NULL DEFAULT '',
    "geocodedAt" DATETIME,
    "verifiedById" INTEGER,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Accused_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccusedPhoto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accusedId" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "locationAddress" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccusedPhoto_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "Accused" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationCheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accusedId" INTEGER NOT NULL,
    "officerId" INTEGER,
    "action" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "locationStatus" TEXT NOT NULL,
    "locationAccuracy" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationCheck_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "Accused" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationCheck_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "objectId" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "normalizedQuery" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "latitude" REAL,
    "longitude" REAL,
    "accuracy" TEXT NOT NULL DEFAULT 'unknown',
    "displayName" TEXT NOT NULL DEFAULT '',
    "rawJson" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "ipAddress" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successful" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "FamousPlace" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "photo" TEXT
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodeCache_normalizedQuery_key" ON "GeocodeCache"("normalizedQuery");

-- CreateIndex
CREATE INDEX "LoginAttempt_username_timestamp_idx" ON "LoginAttempt"("username", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");
