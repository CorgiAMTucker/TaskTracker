-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('BROKER_REQUEST', 'TASK');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('ENDORSEMENT', 'CUSTOMER_QUESTION', 'OTHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'REQUESTER';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "atlasLink" TEXT,
ADD COLUMN     "coverageRequested" TEXT,
ADD COLUMN     "entityFein" TEXT,
ADD COLUMN     "limitsRequested" TEXT,
ADD COLUMN     "questionnaireFileName" TEXT,
ADD COLUMN     "questionnaireFileUrl" TEXT,
ADD COLUMN     "requestKind" "RequestKind" NOT NULL DEFAULT 'TASK',
ADD COLUMN     "requesterFirstName" TEXT,
ADD COLUMN     "requesterLastName" TEXT,
ADD COLUMN     "requesterPhone" TEXT,
ADD COLUMN     "taskKind" "TaskKind";

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_taskId_idx" ON "Note"("taskId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

