import { Request, Response } from 'express';
import { handleControllerError, sendError } from '../lib/http';

export const uploadIssueImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      sendError(res, 400, 'Image file is required');
      return;
    }

    const filePath = `/uploads/${file.filename}`;
    res.status(201).json({
      message: 'Image uploaded successfully',
      url: filePath,
    });
  } catch (err) {
    handleControllerError('uploadIssueImage', res, err);
  }
};
