import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { v2 as cloudinary } from 'cloudinary';
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteImageFromCloudinary, deleteVideoFromCloudinary } from "../utils/cloudinary.js"

// const extractPublicId = (url) => {
//     if (!url) return null; // Handle invalid input
//     const parts = url.split("/"); // Split by '/'
//     const fileNameWithExt = parts.pop(); // Get the last part (file name with extension)
//     const publicId = fileNameWithExt.split(".")[0]; // Remove the extension
//     return publicId;
// };

// const getAllVideos = asyncHandler(async (req, res) => {
//     const { userId, page = 2, limit = 5, sortBy = "createdAt", sortType = "desc" } = req.query;

//     // Ensure `page` and `limit` are integers
//     const pageNum = parseInt(page, 10);
//     const limitNum = parseInt(limit, 10);

//     const videosPipeline = [
//         // Filter videos by userId
//         {
//             $match: {
//                 owner: new mongoose.Types.ObjectId(userId),
//             },
//         },
//         // Join with the User collection to get user details
//         {
//             $lookup: {
//                 from: "users",
//                 localField: "owner",
//                 foreignField: "_id",
//                 as: "userDetails",
//             },
//         },
//         {
//             $unwind: "$userDetails", // Flatten the user details array
//         },
//         // Exclude unwanted fields from userDetails
//         {
//             $project: {
//                 title: 1,
//                 description: 1,
//                 thumbnail: 1,
//                 videoFile: 1,
//                 createdAt: 1,
//                 owner: 1,
//                 "userDetails.fullname": 1,
//                 "userDetails.username": 1,
//                 "userDetails.avatar": 1,
//             },
//         },
//         // Sort by specified field
//         {
//             $sort: {
//                 [sortBy]: sortType === "asc" ? 1 : -1,
//             },
//         },
//         // Pagination logic
//         {
//             $facet: {
//                 metadata: [
//                     { $count: "totalVideos" }, // Total count of videos
//                 ],
//                 videos: [
//                     { $skip: (pageNum - 1) * limitNum }, // Skip to the desired page
//                     { $limit: limitNum }, // Limit the number of videos for the page
//                 ],
//             },
//         },
//         // Restructure the response for clarity
//         {
//             $project: {
//                 totalVideos: { $arrayElemAt: ["$metadata.totalVideos", 0] }, // Extract totalVideos
//                 videos: 1,
//             },
//         },
//     ];

//     // Execute the aggregation pipeline
//     const results = await Video.aggregate(videosPipeline);

//     // Extract the total count and paginated videos
//     const { totalVideos = 0, videos = [] } = results[0] || {};

//     return res.status(200).json(
//         new ApiResponse(200, {
//             totalVideos,
//             videos,
//             page: pageNum,
//             limit: limitNum,
//         }, "Videos fetched successfully")
//     );
// });

const getAllVideos = asyncHandler(async (req, res) => {
    const { page=1, limit=2, query, sortBy, sortType, userId } = req.query

    // match videos on id
    // lookup : to get userdeatails
    //sort : based on createdAt
    //project
    // page = req.query.page || 1
    // limit = req.query.limit || 10
    const options = {
        page: Number(page),
        limit: Number(limit),
        customLabels: {
            totalDocs: "totalVideos",
            docs: "videos",
        }
    }

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails",
            },
        },
        {
            $sort: {
                createdAt: sortType === "asc" ? 1 : -1
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                owner: 1,
                // userDetails: {
                //     $map: {
                //         input: "$userDetails",
                //         as: "user",
                //         in: {
                //             $mergeObjects: [
                //                 "$$user",
                //                 {
                //                     name: "$$user.fullName",
                //                     email: "$$user.email",
                //                     avatar: "$$user.avatar",
                //                     username: "$$user.username"
                //                 },
                //             ],
                //         }
                //     }
                // }
                "userDetails.fullName": 1,
                "userDetails.username": 1,
                "userDetails.avatar": 1,
            }
        }
    ]

    Video.aggregatePaginate(pipeline, options)
    .then(function(result){
        res.status(200).json(
            new ApiResponse(200, result, "Successfully fetched all videos")
        )
    })
    .catch(function(error){
        res.status(500).json(
            new ApiResponse(500, error,"Pagination had some issues")
        )
    })

})

const addVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "Title and Description are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video file & Thumbnail are required")
    }
    // console.log(req.files)

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile || !videoFile?.duration) {
        throw new ApiError(500, "Failed to upload video to Cloudinary")
    }
    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user?._id  //JWT middleware adds user to the request, so i have access of the user
    })

    return res.status(200).json(
        new ApiResponse(200, video, "Video added successully!")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    return res.status(200).json(
        new ApiResponse(200, { video }, "Video fetched successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // const videoPublicId = extractPublicId(video.videoFile)
    // const thumbnailPublicId = extractPublicId(video.thumbnail)

    // if(!videoPublicId || !thumbnailPublicId){
    //     throw new ApiError(500, "Failed to fetch public id's of videofile or thumbnail")
    // }

    // try {
    //     if(videoPublicId){
    //         await cloudinary.uploader.destroy(videoPublicId, {resource_type: "video"})
    //     }
    //     if(thumbnailPublicId){
    //         await cloudinary.uploader.destroy(thumbnailPublicId, {resource_type: "image"})
    //     }
    // } catch (error) {
    //     console.error("Error deleting image from Cloudinary:", error);
    //     throw new Error("Failed to delete files from Cloudinary");
    // }
    const videoDeleted = await deleteVideoFromCloudinary(video.videoFile)
    const thumbnailDeleted = await deleteImageFromCloudinary(video.thumbnail)
    if (!videoDeleted || !thumbnailDeleted) {
        throw new ApiError(500, "Deletion from cloudinary faced some issues")
    }

    await Video.findByIdAndDelete(videoId)
    return res.status(200).json(
        new ApiResponse(200, null, "Video deleted successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req?.file?.path;

    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(400, "Please provide either title or description")
    }

    if (thumbnailLocalPath) {
        var thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail.url) {
            throw new ApiError(500, "Failed to upload thumbnail to Cloudinary")
        }
        const currentVideo = await Video.findById(videoId)
        const deleteThumbnail = await deleteImageFromCloudinary(currentVideo.thumbnail)
        if (!deleteThumbnail) {
            throw new ApiError(500, "Failed to delete thumbnail from Cloudinary")
        }
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url,
            }
        },
        { new: true }
    )

    return res.status(200).json(
        new ApiResponse(200, video, "Video details updated successfully")
    )

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    video.isPublished = !video.isPublished;
    await video.save()

    return res.status(200).json(
        new ApiResponse(200, video, "Video publish status changed successfully")
    )
})


export {
    getAllVideos,
    addVideo,
    getVideoById,
    deleteVideo,
    updateVideo,
    togglePublishStatus
}