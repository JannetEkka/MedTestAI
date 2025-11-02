// routes/document.routes.js
import express from 'express';
import multer from 'multer';
import documentProcessor from '../services/documentProcessor.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.post('/process', 
  upload.single('document'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const result = await documentProcessor.processDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      data: result
    });
  })
);

export default router;