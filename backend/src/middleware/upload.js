import multer from 'multer';

const fileFilter = (_req, file, cb) => {
  // Quick first check; the real validation is done by decoding the image (imageService).
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
  const err = new Error('Only JPG, PNG or WebP images are allowed.');
  err.code = 'BAD_FILE_TYPE';
  cb(err);
};

const make = (maxMb, files) =>
  multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: maxMb * 1024 * 1024, files, fields: 30 } });

export const foodImages = make(3, 3).array('images', 3);
export const promoImage = make(5, 1).single('image');
