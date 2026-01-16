import { get } from './lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// JWT_SECRET은 환경 변수에서 필수로 가져와야 함 (보안)
const JWT_SECRET = process.env.JWT_SECRET;

// 환경 변수 검증: JWT_SECRET이 없으면 즉시 에러
if (!JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
    console.error('   Please set JWT_SECRET in your environment variables (.env.local or Vercel)');
    console.error('   This is required for secure JWT token generation.');
}

export default async function handler(req, res) {
    // JWT_SECRET이 없으면 로그인 요청 거부
    if (!JWT_SECRET) {
        console.error('Login attempt failed: JWT_SECRET not configured');
        return res.status(500).json({ 
            error: 'Server configuration error',
            message: 'Authentication service is not properly configured. Please contact administrator.'
        });
    }
    // Basic CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
