const path = require('path');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

const ALICE_ID = '11111111-1111-1111-1111-111111111111';
const BOB_ID = '22222222-2222-2222-2222-222222222222';
const GENERAL_ROOM_ID = '33333333-3333-3333-3333-333333333333';

const USERS = [
  { id: ALICE_ID, username: 'alice', email: 'alice@test.com' },
  { id: BOB_ID, username: 'bob', email: 'bob@test.com' },
];

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        username: user.username,
        email: user.email,
      },
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        passwordHash: 'dev-only-not-for-production',
        presenceStatus: 'OFFLINE',
      },
    });
  }

  await prisma.room.upsert({
    where: { id: GENERAL_ROOM_ID },
    update: { name: 'General' },
    create: {
      id: GENERAL_ROOM_ID,
      name: 'General',
      type: 'GROUP',
    },
  });

  for (const user of USERS) {
    await prisma.roomMember.upsert({
      where: {
        roomId_userId: { roomId: GENERAL_ROOM_ID, userId: user.id },
      },
      update: {},
      create: {
        roomId: GENERAL_ROOM_ID,
        userId: user.id,
        role: user.id === ALICE_ID ? 'OWNER' : 'MEMBER',
      },
    });
  }

  const existingWelcome = await prisma.message.findFirst({
    where: { roomId: GENERAL_ROOM_ID, type: 'SYSTEM' },
  });

  if (!existingWelcome) {
    await prisma.message.create({
      data: {
        roomId: GENERAL_ROOM_ID,
        senderId: ALICE_ID,
        content: 'Welcome to General! Seed data is ready, open the Chat tab to test.',
        type: 'SYSTEM',
      },
    });
  }
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
