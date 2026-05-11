import { Router } from 'express';
import { register, login, logout, me, forgotPassword, resetPassword, createUserByAdmin } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.post('/admin/users', authMiddleware, adminMiddleware, createUserByAdmin);

export default router;
