import { Request, Response } from 'express';

export const uploadIssueImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    const filePath = `/uploads/${file.filename}`;
    res.status(201).json({
      message: 'Image uploaded successfully',
      url: filePath,
    });
  } catch (err) {
    console.error('[uploadIssueImage]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
