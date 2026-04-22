import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import portalCtrl from '../controllers/portal.controller.js';

const router = express.Router();

router.use(protect);
router.use(authorize('parent', 'student'));

router.get('/overview', portalCtrl.getPortalOverview);
router.get('/fees', portalCtrl.getPortalFees);
router.post('/fees/create-order', portalCtrl.createPortalFeeOrder);
router.post('/fees/verify-payment', portalCtrl.verifyPortalFeePayment);
router.get('/attendance', portalCtrl.getPortalAttendance);
router.get('/timetable', portalCtrl.getPortalTimetable);
router.get('/homework', portalCtrl.getPortalHomework);
router.get('/circulars', portalCtrl.getPortalCirculars);
router.get('/exams', portalCtrl.getPortalExams);
router.get('/report-cards/:examId', portalCtrl.getPortalReportCard);
router.get('/library', portalCtrl.getPortalLibrary);
router.get('/leaves', portalCtrl.getPortalLeaves);
router.post('/leaves', portalCtrl.createPortalLeave);

export default router;
