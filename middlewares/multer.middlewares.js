import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp");
  },
  filename: (req, file, cb) => {
    const uniqueSuffixName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffixName + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });
