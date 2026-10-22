import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { handleControllerError, sendError } from '../lib/http';

export const uploadIssueImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      sendError(res, 400, 'Image file is required');
      return;
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let url: string;

    if (process.env.VERCEL) {
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase Storage environment variables are not configured');
      }

      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/issue-images/${filename}`,
        {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': file.mimetype,
          },
          body: file.buffer,
        }
      );

      if (!response.ok) {
        throw new Error(`Supabase Storage upload failed (${response.status})`);
      }

      url = `${supabaseUrl}/storage/v1/object/public/issue-images/${filename}`;
    } else {
      const uploadDirectory = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDirectory, { recursive: true });
      await fs.writeFile(path.join(uploadDirectory, filename), file.buffer);
      url = `/uploads/${filename}`;
    }

    res.status(201).json({
      message: 'Image uploaded successfully',
      url,
    });
  } catch (err) {
    handleControllerError('uploadIssueImage', res, err);
  }
};
