-- username is a display name, not an identity key: two different Java
-- accounts can legitimately share one (two people named "Said", or
-- test@gmail.com vs test@yahoo.com both deriving "test"). `id` (the Java
-- account's UUID) is the only per-person unique key this service uses.
-- Keeping @unique here meant the second colliding user's every chat
-- request failed with a Prisma unique-constraint error.
DROP INDEX "User_username_key";

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");
