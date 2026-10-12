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

		String contentType = file.getContentType();
		if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
			throw new BadRequestException("Only image files are allowed.");
		}

		if (!hasValidImageMagicBytes(file))
			throw new BadRequestException("Invalid file content. Uploaded file is not a valid image format.");

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
			log.error("Error uploading image to MinIO: {}", e.getMessage(), e);
			throw new RuntimeException("Failed to upload image to MinIO: " + e.getMessage(), e);
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
			log.warn("Failed to delete avatar object from MinIO: {}", e.getMessage());
		}
	}

	private boolean hasValidImageMagicBytes(MultipartFile file) {
		try (InputStream is = file.getInputStream()) {
			byte[] header = new byte[12];
			int bytesRead = is.read(header);
			if (bytesRead < 4) {
				return false;
			}

			boolean isJpeg = (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;

			boolean isPng = (header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
					(header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47;

			boolean isWebp = bytesRead >= 12 &&
					header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
					header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';

			boolean isGif = header[0] == 'G' && header[1] == 'I' && header[2] == 'F';

			return isJpeg || isPng || isWebp || isGif;
		} catch (Exception e) {
			log.warn("Failed to read file magic bytes: {}", e.getMessage());
			return false;
		}
	}
}
