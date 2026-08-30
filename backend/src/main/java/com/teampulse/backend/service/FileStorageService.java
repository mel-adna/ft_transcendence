package com.teampulse.backend.service;

import java.io.InputStream;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.teampulse.backend.exception.BadRequestException;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileStorageService {

	private final MinioClient minioClient;

	@Value("${minio.bucket-name}")
	private String bucketName;

	@Value("${minio.public-url}")
	private String publicUrl;

	public String uploadAvatar(MultipartFile file) {
		if (file.isEmpty())
			throw new BadRequestException("File cannot be empty");

		String contentType = file.getContentType();
		if (contentType == null || !contentType.startsWith("image/")) {
			throw new BadRequestException("Only image files are allowed");
		}

		try {
			boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
			if (!found)
				minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());

			String policy = """
						{
							"Version": "2012-10-17",
							"Statement": [
					              {
					                "Effect": "Allow",
					                "Principal": "*",
					                "Action": ["s3:GetObject"],
					                "Resource": ["arn:aws:s3:::%s/*"]
					              }
					            ]
						}
					""".formatted(bucketName);

			minioClient.setBucketPolicy(
					SetBucketPolicyArgs.builder()
							.bucket(bucketName)
							.config(policy)
							.build());

			String originalFileName = file.getOriginalFilename();
			String extention = originalFileName != null && originalFileName.contains(".")
					? originalFileName.substring(originalFileName.lastIndexOf("."))
					: ".jpg";
			String fileName = "avatar-" + UUID.randomUUID() + extention;

			try (InputStream input = file.getInputStream()) {
				minioClient.putObject(
						PutObjectArgs.builder()
								.bucket(bucketName)
								.object(fileName)
								.stream(input, file.getSize(), -1)
								.contentType(file.getContentType())
								.build());
			}

			return String.format("%s/%s/%s", publicUrl, bucketName, fileName);
		} catch (Exception e) {
			throw new RuntimeException("Failed to upload image to MinIO: " + e.getMessage(), e);
		}
	}
}
