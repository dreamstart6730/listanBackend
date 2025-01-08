const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    // Delete all existing data
    await prisma.request.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();

    // Create default admin user
    const hashedPassword = await bcrypt.hash('DockTrack', 10);
    await prisma.user.create({
        data: {
            name: 'Admin',
            email: 'admin@doctrack.jp',
            password: hashedPassword,
            role: 1, // Assuming role 1 is for admin
        },
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });