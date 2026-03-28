import s3Client from "../s3Config.js";
import { Upload } from "@aws-sdk/lib-storage";

export const uploadImage = async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded.');

    try {
        // Create a unique file name
        const fileName = `uploads/${Date.now()}-${file.originalname}`;
        
        // Prepare the upload command
        const parallelUploadS3 = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: fileName,
                Body: file.buffer, 
                ContentType: file.mimetype,
            },
            queueSize: 4, 
            partSize: 5 * 1024 * 1024, 
        });

        // Send to AWS
        const result = await parallelUploadS3.done();

        // URL
        const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        
        res.json({ 
            message: "Upload successful!", 
            url: result.Location || fileUrl 
        });     

    } catch (err) {
        console.error("S3 Upload Error:", err);
        res.status(500).send("Error uploading to S3");
    }
};