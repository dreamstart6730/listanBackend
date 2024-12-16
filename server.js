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
const corsOptions = {
    origin: ['http://localhost:3000', 'http://27.0.234.33:3000', 'http://95.217.42.233:3000'], // Add allowed URLs here
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

const generateContractId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let contractId = "";
    for (let i = 0; i < 5; i++) {
        contractId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return contractId;
};

app.use(cors(corsOptions));

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


app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Avoid exposing whether the email exists
            return res.status(400).json({ message: 'メールアドレスやパスワードが正しくありません。.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'メールアドレスやパスワードが正しくありません。.' });
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
        const clients = await prisma.client.findMany({
            include: {
                user: true, // Include related user information
            },
        });

        const usersWithoutContracts = await prisma.user.findMany({
            where: {
                contractId: null, // Filter users where contractId is null
            },
        });

        res.status(200).json({
            clients,
            usersWithoutContracts, // Return both in a structured object
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Failed to fetch clients.' });
    }
});
app.post('/api/add_client', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id || id == "") {
            return res.status(400).json({ message: 'Id is required.' });
        }
        const user_id = parseInt(id)
        const contractId = generateContractId();
        const newClient = await prisma.client.create({
            data: {
                contractId, // Save the generated contract ID
            },
        });
        const changeUser = await prisma.user.update({
            where: {
                id: user_id,
            },
            data: {
                contractId: contractId,
            },
        });
        const clients = await prisma.client.findMany({
            include: {
                user: true, // Include related user information
            },
        });

        const usersWithoutContracts = await prisma.user.findMany({
            where: {
                contractId: null, // Filter users where contractId is null
            },
        });

        res.status(200).json({
            clients,
            usersWithoutContracts, // Return both in a structured object
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add client.' });
    }
});

app.put('/api/update_client/:id', async (req, res) => {
    try {
        console.log(req.body);
        const { id, user, memo } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'id is required.' });
        }

        const updateUser = await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                name: user.name,
            }
        });
        const updatedClient_data = await prisma.client.update({
            where: {
                id: id,
            },
            data: {
                memo: memo,
            },
        });
        const clients = await prisma.client.findMany({
            include: {
                user: true, // Include related user information
            },
        });

        const usersWithoutContracts = await prisma.user.findMany({
            where: {
                contractId: null, // Filter users where contractId is null
            },
        });

        res.status(200).json({
            clients,
            usersWithoutContracts, // Return both in a structured object
        });
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
        // Generate a secure token
        const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

        // Save the token to the database (optional)
        await prisma.user.update({
            where: { email },
            data: { passwordResetToken: resetToken },
        });

        // Create a reset link
        const resetLink = `http://localhost:3000/auth/resetpassword?token=${resetToken}`;

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

app.get('/api/user', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
        if (!token) {
            return res.status(401).json({ message: 'Authorization token required.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET); // Validate and decode token
        const userId = decoded.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

app.put('/api/update_user_pass', async (req, res) => {
    try {
        // console.log(req.body);
        const token = req.body.headers?.Authorization?.split(' ')[1]; // Extract token from Authorization header
        if (!token) {
            return res.status(401).json({ message: 'Authorization token required.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET); // Decode the token to get user ID
        const userId = decoded.id;

        const { changePass } = req.body; // The new password sent from the frontend

        if (!changePass || changePass.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(changePass, 10);

        // Update the user's password in the database
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Error updating password:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please log in again.' });
        }
        return res.status(500).json({ message: 'Failed to update password.' });
    }
});

app.post('/api/add_request', async (req, res) => {
    try {
        // Generate a unique ID for the request
        const requestRandId = generateContractId();

        // Destructure and validate required fields from the request body
        const {
            userId,
            projectName,
            mainCondition = {},  // Default to empty object if not provided
            subCondition = {},   // Default to empty object if not provided
            areaSelection,
            areaMemo,
            completeState = 0,   // Default to 0 if not provided
        } = req.body;

        // Validate required fields
        if (!userId || !projectName || !areaSelection || !areaMemo) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert the new request into the database
        const newRequest = await prisma.request.create({
            data: {
                userId,
                requestRandId,      // Assign the generated random ID
                projectName,
                mainCondition,      // Prisma accepts JSON objects directly
                subCondition,
                areaSelection,
                areaMemo,
                completeState,
            },
        });

        // Return the newly created request
        return res.status(201).json(newRequest);

    } catch (error) {
        console.error('Error saving request:', error);

        // Handle database errors (e.g., unique constraint violation)
        if (error.code === 'P2002' && error.meta?.target?.includes('requestRandId')) {
            return res.status(409).json({ error: 'Duplicate requestRandId. Please try again.' });
        }

        // General server error
        return res.status(500).json({ error: 'An error occurred while saving the request' });
    }
});

app.get('/api/requestLists', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const requests = await prisma.request.findMany({
            where: { userId: parseInt(userId, 10) },
        });

        res.status(200).json({ requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.put('/api/update_request/:id', async (req, res) => {
    const { id } = req.params;
    const {
        projectName,
        mainCondition,
        subCondition,
        areaSelection,
        areaMemo,
        completeState,
    } = req.body;

    try {
        const updatedRequest = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: {
                projectName,
                mainCondition,
                subCondition,
                areaSelection,
                areaMemo,
                completeState,
            },
        });

        res.status(200).json(updatedRequest);
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.get("/", (req, res) => {
    res.send("Hello");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});