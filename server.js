const express = require('express');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
app.use(cors());
app.use(express.json());

app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.post('/users', async (req, res) => {
    const { name, email } = req.body;
    const user = await prisma.user.create({
        data: { name, email },
    });
    res.json(user);
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        console.log(req)
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(201).json({ message: 'User created successfully.', token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error.' });
    }
});


// app.post('/api/auth/signin', async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         if (!email || !password) {
//             return res.status(400).json({ message: 'Email and password are required.' });
//         }

//         const user = await prisma.user.findUnique({ where: { email } });
//         if (!user) {
//             return res.status(400).json({ message: 'Invalid email or password.' });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(400).json({ message: 'Invalid email or password.' });
//         }

//         const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

//         return res.status(200).json({ message: 'Login successful.', token,  });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: 'Server error.' });
//     }
// });
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Avoid exposing whether the email exists
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Ensure JWT_SECRET is configured
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured in the environment variables.');
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({ message: 'Login successful.', token });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Start the backend server
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await prisma.client.findMany();
        res.status(200).json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch clients.' });
    }
});
app.post('/api/add_client', async (req, res) => {
    const generateContractId = () => {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let contractId = "";
        for (let i = 0; i < 5; i++) {
            contractId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return contractId;
    };
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required.' });
        }

        const contractId = generateContractId();
        const newClient = await prisma.client.create({
            data: {
                name,
                contractId, // Save the generated contract ID
            },
        });

        res.status(201).json(newClient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add client.' });
    }
});

app.put('/api/update_client/:id', async (req, res) => {
    try {
        const { id, name, memo } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'id is required.' });
        }

        const updatedClient = await prisma.client.update({
            where: {
                id: id,
            },
            data: {
                name: name,
                memo: memo,
            },
        });

        res.status(201).json(updatedClient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to change client.' });
    }
});

app.post('/api/auth/password-reset-request', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Email not found.' });
        }
        console.log()
        // Generate a secure token
        const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

        // Save the token to the database (optional)
        await prisma.user.update({
            where: { email },
            data: { passwordResetToken: resetToken },
        });

        // Create a reset link
        const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;

        // Send the email
        const transporter = nodemailer.createTransport({
            host: 'sv8410.xserver.jp', // Your mail host
            port: 587,                // SMTP port for TLS (use 465 for SSL)
            secure: false,            // Use true if port is 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false, // Allow self-signed certificates if needed
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'パスワードリセット',
            html: `<p>私たちはあなたのパスワードリセット要求を受け取りました。下のリンクをクリックしてパスワードをリセットしてください。</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>これをリクエストしていない場合は、このメールを無視してください。</p>`,
        });

        res.status(200).json({ message: 'Password reset link sent.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.passwordResetToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user's password and clear the reset token
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, passwordResetToken: "" },
        });

        res.status(200).json({ message: 'Password reset successful.' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid or expired token.' });
    }
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});