-- AlterTable
ALTER TABLE "RoomMember" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACCEPTED';

-- CreateIndex
CREATE INDEX "RoomMember_status_idx" ON "RoomMember"("status");
