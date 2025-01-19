import multer from 'multer'

// let counter = 1;
// const getUniqueSuffix = () => {
//   if (counter > 9999) counter = 1; // Reset after reaching 9999
//   const suffix = counter.toString().padStart(4, '0'); // Ensure 4 digits
//   counter++;
//   return suffix;
// };

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        //   const uniqueSuffix = getUniqueSuffix()
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage: storage,
})