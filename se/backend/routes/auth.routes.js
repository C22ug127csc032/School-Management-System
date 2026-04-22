// routes/auth.routes.js
import express from 'express';
import { login, getParentRegistrationPreview, registerParent, getMe, changePassword, updateProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const r = express.Router();
r.post('/login', login);
r.get('/parent-registration-preview/:admissionNo', getParentRegistrationPreview);
r.post('/parent-register', registerParent);
r.get('/me', protect, getMe);
r.put('/change-password', protect, changePassword);
r.put('/profile', protect, updateProfile);
export default r;
