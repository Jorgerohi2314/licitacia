import { db } from '../lib/db';

async function createAdmin() {
  try {
    const admin = await db.user.upsert({
      where: { email: 'admin@example.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created/updated:', admin);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await db.$disconnect();
  }
}

createAdmin();