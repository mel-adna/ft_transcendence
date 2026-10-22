package com.teampulse.backend.service;

import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;

import io.minio.*;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.teampulse.backend.exception.BadRequestException;

import lombok.RequiredArgsConstructor;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileStorageService {

	private final MinioClient minioClient;

	@Value("${minio.bucket-name}")
	private String bucketName;

	@Value("${minio.public-url}")
	private String publicUrl;


	@PostConstruct
	public void initBucket() {
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

			log.info("MinIO bucket '{}' initialized successfully.", bucketName);

		} catch (Exception ex) {
			log.error("Could not initialize MinIO bucket '{}': {}", bucketName, ex.getMessage());
		}
	}

	public String uploadAvatar(UUID userId, MultipartFile file) {
		if (file == null || file.isEmpty())
			throw new BadRequestException("File cannot be empty");

		AvatarImageValidator.validate(file);

		try {
			String originalFileName = file.getOriginalFilename();
			String extension = (originalFileName != null && originalFileName.contains("."))
					? originalFileName.substring(originalFileName.lastIndexOf(".")).toLowerCase(Locale.ROOT)
					: ".jpg";

			String objectKey = "users/" + userId + "/avatars/avatar-" + UUID.randomUUID() + extension;

			try (InputStream input = file.getInputStream()) {
				minioClient.putObject(
						PutObjectArgs.builder()
								.bucket(bucketName)
								.object(objectKey)
								.stream(input, file.getSize(), -1)
								.contentType(file.getContentType())
								.build());
			}

			return String.format("%s/%s/%s", publicUrl, bucketName, objectKey);

		} catch (Exception e) {
			log.error("Avatar upload failed: {}", e.getClass().getSimpleName());
			throw new IllegalStateException("Failed to upload image to object storage.", e);
		}
	}

	public void deleteAvatar(UUID userId, String avatarUrl) {
		if (avatarUrl == null || avatarUrl.isBlank()) {
			return;
		}

		try {
			String prefix = publicUrl + "/" + bucketName + "/";
			String objectKey;

			if (avatarUrl.startsWith(prefix)) {
				objectKey = avatarUrl.substring(prefix.length());
			} else {
				objectKey = avatarUrl.substring(avatarUrl.lastIndexOf('/') + 1);
			}

			String expectedPrefix = "users/" + userId + "/avatars/";
			if (!objectKey.startsWith(expectedPrefix)) {
				log.warn("Security rejection: Attempted to delete unowned avatar object [{}] for user [{}]", objectKey, userId);
				return;
			}

			minioClient.removeObject(
					RemoveObjectArgs.builder()
							.bucket(bucketName)
							.object(objectKey)
							.build()
			);
			log.info("Successfully deleted avatar object [{}] from MinIO.", objectKey);
		} catch (Exception e) {
			log.warn("Failed to delete avatar object from MinIO: {}", e.getClass().getSimpleName());
		}
	}

}
