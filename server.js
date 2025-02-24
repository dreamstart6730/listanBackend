const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csvParser = require('csv-parser');
const iconv = require('iconv-lite');
const path = require('path');

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

const upload = multer({
    dest: 'uploads/', // Destination folder for uploads
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname) !== '.csv') {
            return cb(new Error('Only .csv files are allowed'), false);
        }
        cb(null, true);
    },
});
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

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'すべてのフィールドは必須です。' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'メールがすでに登録されています。' });
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
        return res.status(201).json({ message: 'ユーザーが正常に作成されました。ログインしてください。', token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error.' });
    }
});


app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'メールとパスワードが必要です。' });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'メールアドレスやパスワードが正しくありません。.' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'メールアドレスやパスワードが正しくありません。.' });
        }
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured in the environment variables.');
        }
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ message: 'ログインに成功しました。', token });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'サーバー エラーです。' });
    }
});

// Start the backend server
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            include: {
                user: {
                    include: {
                        requests: true, // Fetch requests related to the user
                    },
                }, // Include related user information
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

app.post('/api/make_client', async (req, res) => {
    try {
        const { user_name, user_email } = req.body;

        if (user_name == "" || user_email == "") {
            return res.status(400).json({ message: '入力情報が正しくありません。' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: user_email } });
        if (existingUser) {
            return res.status(400).json({ message: 'メールがすでに登録されています。' });
        }

        const user_pass = "listanPass";
        const hashedPassword = await bcrypt.hash(user_pass, 10);

        const user = await prisma.user.create({
            data: {
                name: user_name,
                email: user_email,
                password: hashedPassword,
            },
        });

        const user_id = parseInt(user.id)
        const contractId = generateContractId();
        const newClient = await prisma.client.create({
            data: {
                contractId, // Save the generated contract ID
            },
        });
        const changedHashPass = await bcrypt.hash(contractId, 10);
        const changeUser = await prisma.user.update({
            where: {
                id: user_id,
            },
            data: {
                contractId: contractId,
                password: changedHashPass,
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
            include: {
                requests: true, // Fetch requests related to the user
            },
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
            wishNum,
            mainCondition = {},  // Default to empty object if not provided
            subCondition = {},   // Default to empty object if not provided
            areaSelection = {},
            areaMemo = "",
            completeState = 0,   // Default to 0 if not provided
            cancelState = 0,
        } = req.body;

        // Validate required fields
        if (!userId || !projectName || !areaSelection) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let requestAt = null;
        if (completeState == 1) {
            requestAt = new Date();
        }
        // Insert the new request into the database
        const newRequest = await prisma.request.create({
            data: {
                userId,
                requestRandId,      // Assign the generated random ID
                projectName,
                wishNum,
                mainCondition,      // Prisma accepts JSON objects directly
                subCondition,
                areaSelection,
                areaMemo,
                completeState,
                requestAt,
                cancelState,
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

app.post('/api/add_request_blue', async (req, res) => {
    try {
        // Generate a unique ID for the request
        const requestRandId = generateContractId();

        // Destructure and validate required fields from the request body
        const {
            userId,
            projectName,
            wishNum,
            detailCondition = {},  // Default to empty object if not provided
            areaSelection = {},
            areaMemo = "",
            tags,
            completeState = 0,   // Default to 0 if not provided
            cancelState = 0,   // Default to 0 if not provided
        } = req.body;

        // Validate required fields
        if (!userId || !projectName || !areaSelection) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let requestAt = null;
        if (completeState == 1) {
            requestAt = new Date();
        }
        // Insert the new request into the database
        const newRequestBlue = await prisma.requestBlue.create({
            data: {
                userId,
                requestRandId,      // Assign the generated random ID
                projectName,
                wishNum,
                detailCondition,      // Prisma accepts JSON objects directly
                areaSelection,
                areaMemo,
                tags,
                completeState,
                requestAt,
                cancelState,
            },
        });

        // Return the newly created request
        return res.status(201).json(newRequestBlue);

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

app.post('/api/add_request_yellow', async (req, res) => {
    try {
        // Generate a unique ID for the request
        const requestRandId = generateContractId();

        // Destructure and validate required fields from the request body
        const {
            userId,
            projectName,
            wishNum,
            areaSelection = {},
            areaMemo = "",
            portalSite = "",
            completeState = 0,   // Default to 0 if not provided
            cancelState = 0,   // Default to 0 if not provided
        } = req.body;

        // Validate required fields
        if (!userId || !projectName || !areaSelection) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let requestAt = null;
        if (completeState == 1) {
            requestAt = new Date();
        }
        // Insert the new request into the database
        const newRequestYellow = await prisma.requestYellow.create({
            data: {
                userId,
                requestRandId,      // Assign the generated random ID
                projectName,
                wishNum,
                areaSelection,
                areaMemo,
                portalSite,
                completeState,
                requestAt,
                cancelState,
            },
        });

        // Return the newly created request
        return res.status(201).json(newRequestYellow);

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

app.post('/api/add_request_pink', async (req, res) => {
    try {
        // Generate a unique ID for the request
        const requestRandId = generateContractId();

        // Destructure and validate required fields from the request body
        const {
            userId,
            projectName,
            wishNum,
            areaSelection = {},
            areaMemo = "",
            completeState = 0,   // Default to 0 if not provided
            cancelState = 0,
        } = req.body;

        // Validate required fields
        if (!userId || !projectName || !areaSelection) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let requestAt = null;
        if (completeState == 1) {
            requestAt = new Date();
        }
        // Insert the new request into the database
        const newRequestPink = await prisma.requestPink.create({
            data: {
                userId,
                requestRandId,      // Assign the generated random ID
                projectName,
                wishNum,
                areaSelection,
                areaMemo,
                completeState,
                requestAt,
                cancelState,
            },
        });

        // Return the newly created request
        return res.status(201).json(newRequestPink);

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

app.post('/api/add_request_red', async (req, res) => {
    try {
        // Generate a unique ID for the request
        const requestRandId = generateContractId();

        // Destructure and validate required fields from the request body
        const {
            userId,
            projectName,
            wishNum,
            areaSelection = {},
            workSelection = {},
            areaMemo = "",
            completeState = 0,   // Default to 0 if not provided
            cancelState = 0,
        } = req.body;

        // Validate required fields
        if (!userId || !projectName || !areaSelection) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let requestAt = null;
        if (completeState == 1) {
            requestAt = new Date();
        }
        // Insert the new request into the database
        const newRequestRed = await prisma.requestRed.create({
            data: {
                userId,
                requestRandId,      // Assign the generated random ID
                projectName,
                wishNum,
                areaSelection,
                workSelection,
                areaMemo,
                completeState,
                requestAt,
                cancelState,
            },
        });

        // Return the newly created request
        return res.status(201).json(newRequestRed);

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
        const requestsBlue = await prisma.requestBlue.findMany({
            where: { userId: parseInt(userId, 10) },
        });
        const requestsYellow = await prisma.requestYellow.findMany({
            where: { userId: parseInt(userId, 10) },
        });
        const requestsPink = await prisma.requestPink.findMany({
            where: { userId: parseInt(userId, 10) },
        });
        let requestsRed = await prisma.requestRed.findMany({
            where: {
                userId: parseInt(userId, 10),
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });

        const redItems = [];
        const redStoreItems = await prisma.redStoreItem.findMany();

        requestsRed.forEach((request) => {
            let completeState = 0;
            const tp_areaSelection = request.areaSelection;
            const tp_workSelection = request.workSelection;
            Object.keys(tp_areaSelection).forEach((areaKey) => {
                tp_areaSelection[areaKey].forEach((area) => {
                    Object.keys(tp_workSelection).forEach((categoryKey) => {
                        tp_workSelection[categoryKey].forEach((item) => {
                            const itemFound = redStoreItems.find(redItem => redItem.category === item && redItem.address.includes(area.trim()));
                            if (itemFound) completeState++;
                            redItems.push({
                                bigCategory: categoryKey,
                                smallCategory: item,
                                area: area,
                                state: itemFound ? "登録済み" : "未登録", // Use ternary for cleaner code
                                updatedDate: new Date()
                            });
                        });
                    });
                });
            });
            if (completeState) request.completeState = 2;
        });

        res.status(200).json({ requests, requestsBlue, requestsYellow, requestsPink, requestsRed });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.get('/api/red_file_download', async (req, res) => {
    const { userId, list_id } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }
    try {
        const requestsRed = await prisma.requestRed.findUnique({
            where: { id: parseInt(list_id, 10) },
            include: {
                user: true, // Include the related user data
            },
        });

        const redItems = [];
        const redStoreItems = await prisma.redStoreItem.findMany();


        const tp_areaSelection = requestsRed.areaSelection;
        const tp_workSelection = requestsRed.workSelection;
        Object.keys(tp_areaSelection).forEach((areaKey) => {
            tp_areaSelection[areaKey].forEach((area) => {
                Object.keys(tp_workSelection).forEach((categoryKey) => {
                    tp_workSelection[categoryKey].forEach((item) => {
                        const itemFound = redStoreItems.find(redItem => redItem.category === item && redItem.address.includes(area.trim()));
                        if (itemFound) {
                            redItems.push({
                                "企業名": itemFound.company,
                                "郵便番号": itemFound.postNum,
                                "住所" : itemFound.address,
                                "電話番号" : itemFound.phone,
                                "FAX番号" : itemFound.fax,
                                "URL" : itemFound.url,
                                "カテゴリ" : itemFound.category,
                            });
                        }
                    });
                });
            });
        });
        res.status(200).json(redItems);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }

});

app.get('/api/request_get', async (req, res) => {
    const { userId, requestId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const request = await prisma.request.findFirst({
            where: { id: parseInt(requestId, 10) },
        });

        res.status(200).json({ request });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.get('/api/request_get_pink', async (req, res) => {
    const { userId, requestId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const requestPink = await prisma.requestPink.findFirst({
            where: { id: parseInt(requestId, 10) },
        });

        res.status(200).json({ requestPink });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.get('/api/request_get_yellow', async (req, res) => {
    const { userId, requestId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const requestYellow = await prisma.requestYellow.findFirst({
            where: { id: parseInt(requestId, 10) },
        });

        res.status(200).json({ requestYellow });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.get('/api/request_get_blue', async (req, res) => {
    const { userId, requestId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const requestBlue = await prisma.requestBlue.findFirst({
            where: { id: parseInt(requestId, 10) },
        });

        res.status(200).json({ requestBlue });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.get('/api/request_get_red', async (req, res) => {
    const { userId, requestId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const requestRed = await prisma.requestRed.findFirst({
            where: { id: parseInt(requestId, 10) },
        });

        res.status(200).json({ requestRed });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.post('/api/requestLists_mana', async (req, res) => {
    const userId = req.body.params.userId;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { id: parseInt(userId, 10) },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 0) {
            return res.status(301).json({ error: 'This is allowed only for a manager' });
        }

        const requests = await prisma.request.findMany({
            where: {
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });
        const requestsPink = await prisma.requestPink.findMany({
            where: {
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });
        const requestsBlue = await prisma.requestBlue.findMany({
            where: {
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });
        const requestsYellow = await prisma.requestYellow.findMany({
            where: {
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });
        const requestsRed = await prisma.requestRed.findMany({
            where: {
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });
        res.status(200).json({ requests, requestsBlue, requestsYellow, requestsPink, requestsRed });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.post('/api/requestLists_red', async (req, res) => {
    const { userId } = req.body.params;
    const token = req.body.headers.Authorization?.split(' ')[1]; // Extract token from Authorization header
    if (!token) {
        return res.status(401).json({ message: 'Authorization token required.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET); // Validate and decode token
        if (!decoded || decoded.id !== userId) {
            return res.status(401).json({ message: 'Invalid token.' });
        }

        const user = await prisma.user.findFirst({
            where: { id: parseInt(userId, 10) },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 0) {
            return res.status(301).json({ error: 'This is allowed only for a manager' });
        }

        const requestsRed = await prisma.requestRed.findMany({
            where: {
                OR: [
                    {
                        completeState: {
                            not: 0
                        }
                    },
                    {
                        cancelState: 1
                    }
                ]
            },
            include: {
                user: true, // Include the related user data
            },
        });

        const combinedRequests = [
            ...requestsRed.map(request => ({ ...request, category: 'レッド' })),
        ];

        const redItems = [];
        const redStoreItems = await prisma.redStoreItem.findMany();

        combinedRequests.forEach((request) => {
            const tp_areaSelection = request.areaSelection;
            const tp_workSelection = request.workSelection;
            // let i=0;
            Object.keys(tp_areaSelection).forEach((areaKey) => {
                tp_areaSelection[areaKey].forEach((area) => {
                    Object.keys(tp_workSelection).forEach((categoryKey) => {
                        tp_workSelection[categoryKey].forEach((item) => {
                            if (item == "IT・情報通信" && area.indexOf("東京都") > -1) {
                                // console.log(i, redStoreItems[100].category, item);
                                // console.log(i, redStoreItems[100].address, area);
                                // console.log(redStoreItems[100]);
                            }
                            const itemFound = redStoreItems.find(redItem => redItem.category === item && redItem.address.includes(area.trim()));
                            console.log(itemFound);
                            redItems.push({
                                bigCategory: categoryKey,
                                smallCategory: item,
                                area: area,
                                state: itemFound ? "登録済み" : "未登録", // Use ternary for cleaner code
                                updatedDate: new Date()
                            });
                        });
                    });
                });
            });
        });

        res.status(200).json({ redItems });

    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'An error occurred while fetching the requests' });
    }
});

app.put('/api/update_request/:id', async (req, res) => {
    const { id } = req.params;
    const {
        projectName,
        wishNum,
        mainCondition,
        subCondition,
        areaSelection,
        areaMemo,
        completeState,
        updatedAt,
        cancelState = 0,
    } = req.body;
    let requestAt = null;
    if (completeState == 1) {
        requestAt = new Date();
    }
    try {
        const updatedRequest = await prisma.request.update({
            where: { id: parseInt(id, 10) },
            data: {
                projectName,
                wishNum,
                mainCondition,
                subCondition,
                areaSelection,
                areaMemo,
                completeState,
                updatedAt,
                requestAt,
                cancelState,
            },
            include: {
                user: true, // Include the related user data
            },
        });
        res.status(200).json(updatedRequest);
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.put('/api/update_request_pink/:id', async (req, res) => {
    const { id } = req.params;
    const {
        projectName,
        wishNum,
        areaSelection,
        areaMemo,
        completeState,
        updatedAt,
        cancelState = 0,
    } = req.body;
    let requestAt = null;
    if (completeState == 1) {
        requestAt = new Date();
    }
    try {
        const updatedRequestPink = await prisma.requestPink.update({
            where: { id: parseInt(id, 10) },
            data: {
                projectName,
                wishNum,
                areaSelection,
                areaMemo,
                completeState,
                updatedAt,
                requestAt,
                cancelState,
            },
            include: {
                user: true, // Include the related user data
            },
        });
        res.status(200).json(updatedRequestPink);
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.put('/api/update_request_yellow/:id', async (req, res) => {
    const { id } = req.params;
    const {
        projectName,
        wishNum,
        areaSelection,
        areaMemo,
        completeState,
        portalSite,
        updatedAt,
        cancelState = 0,
    } = req.body;
    let requestAt = null;
    if (completeState == 1) {
        requestAt = new Date();
    }
    try {
        const updatedRequestYellow = await prisma.requestYellow.update({
            where: { id: parseInt(id, 10) },
            data: {
                projectName,
                wishNum,
                areaSelection,
                areaMemo,
                completeState,
                portalSite,
                updatedAt,
                requestAt,
                cancelState,
            },
            include: {
                user: true, // Include the related user data
            },
        });
        res.status(200).json(updatedRequestYellow);
    } catch (error) {
        console.error("Error updating request:", error); // Log the error
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.put('/api/update_request_blue/:id', async (req, res) => {
    const { id } = req.params;
    const {
        projectName,
        wishNum,
        tags,
        detailCondition,
        areaSelection,
        areaMemo,
        completeState,
        updatedAt,
        cancelState = 0,
    } = req.body;
    let requestAt = null;
    if (completeState == 1) {
        requestAt = new Date();
    }
    try {
        const updatedRequestBlue = await prisma.requestBlue.update({
            where: { id: parseInt(id, 10) },
            data: {
                projectName,
                wishNum,
                tags,
                detailCondition,
                areaSelection,
                areaMemo,
                completeState,
                updatedAt,
                requestAt,
                cancelState,
            },
            include: {
                user: true, // Include the related user data
            },
        });
        res.status(200).json(updatedRequestBlue);
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.put('/api/update_request_red/:id', async (req, res) => {
    const { id } = req.params;
    const {
        projectName,
        wishNum,
        workSelection,
        areaSelection,
        areaMemo,
        completeState,
        updatedAt,
        cancelState = 0,
    } = req.body;
    let requestAt = null;
    if (completeState == 1) {
        requestAt = new Date();
    }
    try {
        const updatedRequestRed = await prisma.requestRed.update({
            where: { id: parseInt(id, 10) },
            data: {
                projectName,
                wishNum,
                workSelection,
                areaSelection,
                areaMemo,
                completeState,
                updatedAt,
                requestAt,
                cancelState,
            },
            include: {
                user: true, // Include the related user data
            },
        });
        res.status(200).json(updatedRequestRed);
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.delete('/api/delete_request/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    try {
        await prisma.request.delete({
            where: { id: requestId },
        });
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete the request' });
    }
});

app.delete('/api/delete_request_blue/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    try {
        await prisma.requestBlue.delete({
            where: { id: requestId },
        });
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete the request' });
    }
});

app.delete('/api/delete_request_yellow/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    try {
        await prisma.requestYellow.delete({
            where: { id: requestId },
        });
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete the request' });
    }
});

app.delete('/api/delete_request_pink/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    try {
        await prisma.requestPink.delete({
            where: { id: requestId },
        });
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete the request' });
    }
});

app.delete('/api/delete_request_red/:id', async (req, res) => {
    const requestId = parseInt(req.params.id, 10);
    try {
        await prisma.requestRed.delete({
            where: { id: requestId },
        });
        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Failed to delete the request' });
    }
});


app.put('/api/cancel_request', async (req, res) => {
    const {
        id,
        category,
    } = req.body;
    const cancelState = 1;
    const completeState = 0;
    const requestAt = null;
    try {
        let updatedRequest;
        switch (category) {
            case 'ピンク':
                updatedRequest = await prisma.requestPink.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        cancelState,
                        completeState,
                        requestAt,
                    },
                    include: {
                        user: true,
                    },
                });
                break;
            case 'ブルー':
                updatedRequest = await prisma.requestBlue.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        cancelState,
                        completeState,
                        requestAt,
                    },
                    include: {
                        user: true,
                    },
                });
                break;
            case 'イエロー':
                updatedRequest = await prisma.requestYellow.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        cancelState,
                        completeState,
                        requestAt,
                    },
                    include: {
                        user: true,
                    },
                });
                break;
            case 'グリーン':
                updatedRequest = await prisma.request.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        cancelState,
                        completeState,
                        requestAt,
                    },
                    include: {
                        user: true,
                    },
                });
                break;
            case 'レッド':
                updatedRequest = await prisma.requestRed.update({
                    where: { id: parseInt(id, 10) },
                    data: {
                        cancelState,
                        completeState,
                        requestAt,
                    },
                    include: {
                        user: true,
                    },
                });
                break;
            default:
                return res.status(400).json({ error: 'Invalid category' });
        }
        res.status(200).json(updatedRequest);
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ error: "An error occurred while updating the request" });
    }
});

app.post('/api/upload-csv', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const records = [];

    try {
        // Parse CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (data) => records.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        // Save records to the database
        for (const record of records) {
            await prisma.request.create({
                data: {
                    // Map CSV fields to database columns
                    projectName: record.projectName,
                    wishNum,
                    mainCondition: JSON.parse(record.mainCondition || '{}'),
                    subCondition: JSON.parse(record.subCondition || '{}'),
                    areaSelection: record.areaSelection,
                    areaMemo: record.areaMemo,
                    completeState: parseInt(record.completeState, 10),
                    userId: parseInt(record.userId, 10),
                },
            });
        }

        res.status(201).json({ message: 'CSV data uploaded successfully' });
    } catch (error) {
        console.error('Error processing CSV:', error);
        res.status(500).json({ error: 'Error processing CSV file' });
    } finally {
        fs.unlink(filePath, () => { }); // Remove temporary file
    }
});

app.post('/api/upload-csv-file', upload.single('file'), async (req, res) => {
    if (!req.file || !req.body.requestId) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    let fileName = "";
    try {
        fileName = Buffer.from(req.file.originalname, 'binary').toString('utf-8');
    } catch (error) {
        console.warn('Error decoding file name, using as is:', error);
    }

    const filePath = req.file.path;
    let rowCount = 0;

    // Parse CSV file to count rows
    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', () => rowCount++)
                .on('end', resolve)
                .on('error', reject);
        });
        const deliveryAt = new Date();

        let updatedRequest;
        if (req.body.category === 'Green') {
            updatedRequest = await prisma.request.update({
                where: { id: parseInt(req.body.requestId, 10) },
                data: {
                    filePath: filePath, // Save the file path
                    fileName: fileName, // Save the file name
                    listCount: rowCount, // Save the row count
                    completeState: 2,
                    deliveryAt: deliveryAt,
                },
                include: {
                    user: true // Include related user information
                },
            });
        } else if (req.body.category === 'Pink') {
            updatedRequest = await prisma.requestPink.update({
                where: { id: parseInt(req.body.requestId, 10) },
                data: {
                    filePath: filePath, // Save the file path
                    fileName: fileName, // Save the file name
                    listCount: rowCount, // Save the row count
                    completeState: 2,
                    deliveryAt: deliveryAt,
                },
                include: {
                    user: true // Include related user information
                },
            });
        } else if (req.body.category === 'Blue') {
            updatedRequest = await prisma.requestBlue.update({
                where: { id: parseInt(req.body.requestId, 10) },
                data: {
                    filePath: filePath, // Save the file path
                    fileName: fileName, // Save the file name
                    listCount: rowCount, // Save the row count
                    completeState: 2,
                    deliveryAt: deliveryAt,
                },
                include: {
                    user: true // Include related user information
                },
            });
        } else if (req.body.category === 'Yellow') {
            updatedRequest = await prisma.requestYellow.update({
                where: { id: parseInt(req.body.requestId, 10) },
                data: {
                    filePath: filePath, // Save the file path
                    fileName: fileName, // Save the file name
                    listCount: rowCount, // Save the row count
                    completeState: 2,
                    deliveryAt: deliveryAt,
                },
                include: {
                    user: true // Include related user information
                },
            });
        } else if (req.body.category === 'Red') {
            updatedRequest = await prisma.requestRed.update({
                where: { id: parseInt(req.body.requestId, 10) },
                data: {
                    filePath: filePath, // Save the file path
                    fileName: fileName, // Save the file name
                    listCount: rowCount, // Save the row count
                    completeState: 2,
                    deliveryAt: deliveryAt,
                },
                include: {
                    user: true // Include related user information
                },
            });
        }
        else {
            return res.status(400).json({ error: 'Invalid category' });
        }

        res.status(200).json({
            message: 'File uploaded successfully',
            updatedRequest: updatedRequest
        });

    } catch (error) {
        console.error('Error processing CSV file:', error);
        return res.status(500).json({ error: 'Failed to process CSV file' });
    }
});

app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error("Error while sending file:", err);
            res.status(500).send("Error while downloading the file.");
        }
    });
});

app.post('/api/upload-red-file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    let fileName = "";
    try {
        fileName = Buffer.from(req.file.originalname, 'binary').toString('utf-8');
    } catch (error) {
        console.warn('Error decoding file name, using as is:', error);
        fileName = req.file.originalname; // Use the original name if decoding fails
    }

    const filePath = req.file.path;
    const records = [];
    const requiredFields = ['会社名', '出典URL', 'カテゴリ'];
    let headerRow = [];
    let startParsing = false;

    // Parse CSV file to get rows
    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(iconv.decodeStream('Shift_JIS')) // Convert from Shift-JIS to UTF-8
                .pipe(csvParser())
                .on('data', (row) => {
                    if (!startParsing) {
                        const keys = Object.values(row).map(k => k.toLowerCase().trim());
                        if (keys.some(key => requiredFields.includes(key))) {
                            startParsing = true;
                            headerRow = keys;
                        }
                    } else {
                        records.push(row);
                    }
                })
                .on('end', () => resolve(records))
                .on('error', reject);
        });

        let i = 0;
        for (const record of records) {
            let correctedRecord = {};
            Object.entries(record).forEach(([key, value], index) => {
                if (headerRow[index] && headerRow[index] !== "" && headerRow[index] !== undefined && headerRow[index] !== null) {
                    correctedRecord[headerRow[index]] = value;
                }
            });
            const mappedRecord = {};
            Object.keys(correctedRecord).forEach((key) => {
                let newKey = key;
                if (key === "電話番号") newKey = "phone";
                if (key === "会社名" || key === "企業名") newKey = "company";
                if (/url/i.test(key)) newKey = "url";
                if (key === "カテゴリ") newKey = "category";
                if (key === "都道府県") newKey = "prefecture";
                if (key === "市区町村") newKey = "city";
                if (key === "住所") newKey = "address";
                if (key === "郵便番号") newKey = "postNum";
                if (/fax/i.test(key)) newKey = "fax";
                if (key === "メールアドレス") newKey = "email";
                mappedRecord[newKey] = correctedRecord[key];
            });

            const existingItem = await prisma.RedStoreItem.findFirst({
                where: { url: mappedRecord['url'] } // Assuming 'url' is the unique column
            });

            if (existingItem) {
                // Update existing item
                await prisma.RedStoreItem.update({
                    where: { id: existingItem.id },
                    data: {
                        company: mappedRecord['company'],
                        category: mappedRecord['category'],
                        phone: mappedRecord['phone'],
                        address: `${mappedRecord['prefecture'] ?? ""} ${mappedRecord['city'] ?? ""} ${mappedRecord['address'] ?? ""}`,
                        postNum: mappedRecord['postNum'],
                        fax: mappedRecord['fax'],
                    }
                });
            } else {
                // Insert new item
                await prisma.RedStoreItem.create({
                    data: {
                        url: mappedRecord['url'],
                        company: mappedRecord['company'],
                        category: mappedRecord['category'],
                        phone: mappedRecord['phone'],
                        address: `${mappedRecord['prefecture'] ?? ""} ${mappedRecord['city'] ?? ""} ${mappedRecord['address'] ?? ""}`,
                        postNum: mappedRecord['postNum'],
                        fax: mappedRecord['fax'],
                    }
                });
            }

            i++;
        }
        // console.log("total_i", i);
        // console.log("header", headerRow);
        res.status(200).json({ message: 'File uploaded and processed successfully' });

    } catch (error) {
        console.error('Error processing CSV file:', error);
        return res.status(500).json({ error: 'Failed to process CSV file' });
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