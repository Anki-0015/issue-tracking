import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { isValidEmail, normalizeEmail } from '../src/lib/validation';


function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for seeding admin user`);
  }
  return value;
}

async function main() {
  const adminName = getRequiredEnv('ADMIN_NAME');
  const adminEmailRaw = getRequiredEnv('ADMIN_EMAIL');
  const adminPassword = getRequiredEnv('ADMIN_PASSWORD');

  if (adminName.length < 2 || adminName.length > 80) {
    throw new Error('ADMIN_NAME must be between 2 and 80 characters');
  }

  if (adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  if (!isValidEmail(adminEmailRaw)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }

  const adminEmail = normalizeEmail(adminEmailRaw);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true },
  });

  if (existingAdmin) {
    if (existingAdmin.role !== UserRole.ADMIN) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: UserRole.ADMIN },
      });
      console.log(`[seed] Promoted existing user to ADMIN: ${adminEmail}`);
      return;
    }

    console.log(`[seed] Admin already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log(`[seed] Created admin user: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error('[seed] Failed to bootstrap admin user', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
