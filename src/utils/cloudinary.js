import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })

        //file uploaded successfully
        // console.log("File uploded successfully on Cloudinary!", response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}

//while deleting something from cluodinary , mentioning resource type is imp
const deleteImageFromCloudinary = async (url) => {
    try {
        // Extract public_id from the URL
        // const fileName = imageUrl.split("/").pop().split(".")[0]; // Extract file name without extension
        if (!url) return null; // Handle invalid input
        const parts = url.split("/"); // Split by '/'
        const fileNameWithExt = parts.pop(); // Get the last part (file name with extension)
        const publicId = fileNameWithExt.split(".")[0]; // Remove the extension
        // Delete the image from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId,
            { resource_type: "image" }
        );
        console.log("Cloudinary response:", result);

        return result;
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        throw new Error("Failed to delete image from Cloudinary");
    }
};

const deleteVideoFromCloudinary = async (url) => {
    try {
        // Extract public_id from the URL
        // const fileName = imageUrl.split("/").pop().split(".")[0]; // Extract file name without extension
        if (!url) return null; // Handle invalid input
        const parts = url.split("/"); // Split by '/'
        const fileNameWithExt = parts.pop(); // Get the last part (file name with extension)
        const publicId = fileNameWithExt.split(".")[0]; // Remove the extension
        // Delete the image from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId,
            { resource_type: "video" }
        );
        console.log("Cloudinary response:", result);

        return result;
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        throw new Error("Failed to delete image from Cloudinary");
    }
};

export { uploadOnCloudinary, deleteVideoFromCloudinary, deleteImageFromCloudinary }