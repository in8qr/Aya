import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const OLD_SEED_EMAILS = [
  "aya@ayaphotography.com",
  "team@ayaphotography.com",
  "customer@example.com",
];

async function main() {
  // Remove old seed users (ITAdmin is the only bootstrap account; create Aya admin and team from app)
  for (const email of OLD_SEED_EMAILS) {
    await prisma.user.deleteMany({ where: { email } });
  }

  const itAdminPassword = await bcrypt.hash("ITAdmin123!", 10);
  const itAdmin = await prisma.user.upsert({
    where: { email: "itadmin@ayaphotography.com" },
    update: {},
    create: {
      email: "itadmin@ayaphotography.com",
      name: "IT Admin",
      role: Role.ADMIN,
      password: itAdminPassword,
      phone: null,
      active: true,
      emailVerifiedAt: new Date(),
    },
  });

  // Backfill: any existing users without emailVerifiedAt can still log in
  await prisma.user.updateMany({
    where: { emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });

  const pkgBasic = {
    name: "Portrait Session",
    priceDisplay: "199 SAR",
    durationMinutes: 60,
    description: "1-hour portrait session with 10 edited digital photos.",
    deliverables: "10 high-res digital images, online gallery",
    visible: true,
    sortOrder: 0,
  };
  await prisma.package.upsert({
    where: { id: "pkg-basic" },
    update: pkgBasic,
    create: { id: "pkg-basic", ...pkgBasic },
  });

  const pkgWedding = {
    name: "Wedding Full Day",
    priceDisplay: "1,499 SAR",
    durationMinutes: 480,
    description: "Full-day wedding coverage.",
    deliverables: "Full gallery, USB with all edited images",
    visible: true,
    sortOrder: 1,
  };
  await prisma.package.upsert({
    where: { id: "pkg-wedding" },
    update: pkgWedding,
    create: { id: "pkg-wedding", ...pkgWedding },
  });

  const packages = await prisma.package.findMany({ select: { id: true, priceDisplay: true } });
  for (const pkg of packages) {
    const needsUpdate = pkg.priceDisplay.includes("€") || pkg.priceDisplay.includes("\u20C1");
    if (needsUpdate) {
      const amount = pkg.priceDisplay.replace(/€\s*/g, "").replace(/\u20C1/g, "").trim();
      await prisma.package.update({
        where: { id: pkg.id },
        data: { priceDisplay: `${amount} SAR` },
      });
      console.log("Updated package", pkg.id, "to SAR");
    }
  }

  console.log("Seeded: ITAdmin", itAdmin.email);
  console.log("Use ITAdmin to log in, then create the Aya admin and team accounts from Admin → Team.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
