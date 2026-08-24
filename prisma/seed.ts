import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/databaseUrl";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const DEFAULT_COLUMNS = ["New", "In Progress", "Blocked", "Done"];
const BOARDS = ["AM Tasks", "Brokering Requests"];

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
    await prisma.user.create({
      data: {
        name: "Tucker Bean",
        email: "tucker@corgi.com",
        passwordHash: await bcrypt.hash(password, 10),
        role: "ADMIN",
      },
    });
    console.log("\nSeeded admin account:");
    console.log("  email:    tucker@corgi.com");
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`  password: ${password}\n`);
    }
  } else {
    console.log("Users already exist, skipping user seed.");
  }

  const existingBoards = await prisma.board.count();
  if (existingBoards === 0) {
    for (const [boardIndex, boardName] of BOARDS.entries()) {
      await prisma.board.create({
        data: {
          name: boardName,
          order: boardIndex,
          columns: {
            create: DEFAULT_COLUMNS.map((name, i) => ({ name, order: i })),
          },
        },
      });
    }
    console.log(`Seeded boards: ${BOARDS.join(", ")}`);
  } else {
    console.log("Boards already exist, skipping board seed.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
