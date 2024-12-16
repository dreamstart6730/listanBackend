import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key'; // Store securely in production

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        try {
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                return res.status(409).json({ message: 'Email already in use.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
            });
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

            return res.status(201).json({ message: 'User created successfully.', token });
        } catch (error) {
            return res.status(500).json({ message: 'Something went wrong.', error: error.message });
        }
    } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
}