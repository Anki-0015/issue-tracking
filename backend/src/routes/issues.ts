import { Router } from 'express';
import {
  createIssue,
  getIssueById,
  getIssueHistory,
  getIssueSummary,
  listIssues,
  updateIssueStatus,
} from '../controllers/issueController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createIssue);
router.get('/', listIssues);
router.get('/summary', getIssueSummary);
router.get('/:id', getIssueById);
router.patch('/:id/status', updateIssueStatus);
router.get('/:id/history', getIssueHistory);

export default router;
