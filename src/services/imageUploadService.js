const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

if (env.cloudinary.configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

function uploadImageBuffer(buffer) {
  if (!env.cloudinary.configured) {
    throw new ApiError(
      503,
      "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET, or use the image URL field instead."
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "agrofix/products", resource_type: "image" },
      (err, result) => {
        if (err) return reject(new ApiError(502, "Image upload failed"));
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = { uploadImageBuffer };
