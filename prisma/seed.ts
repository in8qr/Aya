import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const teamPassword = await bcrypt.hash("Team123!", 10);
  const customerPassword = await bcrypt.hash("Customer123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "aya@ayaphotography.com" },
    update: {},
    create: {
      email: "aya@ayaphotography.com",
      name: "Aya",
      role: Role.ADMIN,
      password: adminPassword,
      phone: "+1234567890",
      active: true,
    },
  });

  const teamMember = await prisma.user.upsert({
    where: { email: "team@ayaphotography.com" },
    update: {},
    create: {
      email: "team@ayaphotography.com",
      name: "Alex Photographer",
      role: Role.TEAM,
      password: teamPassword,
      phone: "+1234567891",
      active: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      name: "Jane Doe",
      role: Role.CUSTOMER,
      password: customerPassword,
      phone: "+1234567892",
      active: true,
    },
  });

  await prisma.package.upsert({
    where: { id: "pkg-basic" },
    update: {},
    create: {
      id: "pkg-basic",
      name: "Portrait Session",
      priceDisplay: "199 \u20C1",
      durationMinutes: 60,
      description: "1-hour portrait session with 10 edited digital photos.",
      deliverables: "10 high-res digital images, online gallery",
      visible: true,
      sortOrder: 0,
    },
  });

  await prisma.package.upsert({
    where: { id: "pkg-wedding" },
    update: {},
    create: {
      id: "pkg-wedding",
      name: "Wedding Full Day",
      priceDisplay: "1,499 \u20C1",
      durationMinutes: 480,
      description: "Full-day wedding coverage.",
      deliverables: "Full gallery, USB with all edited images",
      visible: true,
      sortOrder: 1,
    },
  });

  console.log("Seeded:", { admin: admin.email, teamMember: teamMember.email, customer: customer.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
