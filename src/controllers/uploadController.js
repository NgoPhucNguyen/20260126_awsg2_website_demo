// controllers/uploadController.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 1. Configure S3 Client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

export const uploadImage = async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded.');

    try {
        // Create a unique file name
        const fileName = `uploads/${Date.now()}-${file.originalname}`;
        
        // Prepare the upload command
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
        });

        // Send to AWS
        await s3.send(command);

        // Generate the public URL
        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        
        res.json({ message: "Upload successful!", url: fileUrl });
    } catch (err) {
        console.error("❌ S3 Upload Error:", err);
        res.status(500).send("Error uploading to S3");
    }
};