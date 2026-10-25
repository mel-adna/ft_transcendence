.PHONY: all env secrets certs ps clean fclean backend re


ENV_FILE := $(shell if [ -f .env ]; then echo ".env"; else echo ".env.example"; fi)
DOCKER_ROOT_DIR := $(shell docker info --format '{{.DockerRootDir}}' 2>/dev/null)
DOCKER_SOCK := $(shell docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null | sed -n 's|^unix://||p')
CONTAINERD_SOCK := $(shell docker info --format '{{.Containerd.Address}}' 2>/dev/null)
export DOCKER_ROOT_DIR DOCKER_SOCK CONTAINERD_SOCK

# Words that mean "this example file was not edited yet"
PLACEHOLDER_RE := your|example|changeme|placeholder|replace|xxx


all: env secrets certs
	docker compose --env-file .env up -d --build

env:
	@if [ ! -f .env ]; then \
		if [ -f .env.example ]; then \
			echo "Creating .env from .env.example..."; \
			cp .env.example .env; \
		else \
			echo "Error: .env.example not found!"; \
			exit 1; \
		fi; \
	fi

secrets:
	@mkdir -p secrets
	@chmod 755 secrets
	@if [ ! -f secrets/jwt_secret.txt ]; then \
		echo "Generating jwt_secret..."; \
		openssl rand -base64 48 | tr -d '\r\n' > secrets/jwt_secret.txt; \
		chmod 644 secrets/jwt_secret.txt; \
	fi
	@for secret in db_password redis_password minio_root_password grafana_admin_password; do \
		if [ ! -f "secrets/$$secret.txt" ]; then \
			echo "Generating $$secret..."; \
			openssl rand -hex 16 | tr -d '\r\n' > "secrets/$$secret.txt"; \
			chmod 644 "secrets/$$secret.txt"; \
		fi; \
	done
	@if [ ! -f secrets/mail_password.txt ]; then \
		if [ -n "$$MAIL_PASSWORD" ]; then \
			echo "Using MAIL_PASSWORD from environment..."; \
			printf '%s' "$$MAIL_PASSWORD" > secrets/mail_password.txt; \
		elif [ -s secrets_example/mail_password.txt.example ] && ! grep -qiE '$(PLACEHOLDER_RE)' secrets_example/mail_password.txt.example; then \
			echo "Using secrets_example/mail_password.txt.example..."; \
			tr -d '\r\n' < secrets_example/mail_password.txt.example > secrets/mail_password.txt; \
		else \
			echo "WARNING: mail_password is a random placeholder - emails will NOT work until you replace it."; \
			openssl rand -hex 8 | tr -d '\r\n' > secrets/mail_password.txt; \
		fi; \
		chmod 644 secrets/mail_password.txt; \
	fi
	@if [ ! -f secrets/google_client_secret.txt ]; then \
		if [ -n "$$GOOGLE_CLIENT_SECRET" ]; then \
			echo "Using GOOGLE_CLIENT_SECRET from environment..."; \
			printf '%s' "$$GOOGLE_CLIENT_SECRET" > secrets/google_client_secret.txt; \
		elif [ -s secrets_example/google_client_secret.txt.example ] && ! grep -qiE '$(PLACEHOLDER_RE)' secrets_example/google_client_secret.txt.example; then \
			echo "Using secrets_example/google_client_secret.txt.example..."; \
			tr -d '\r\n' < secrets_example/google_client_secret.txt.example > secrets/google_client_secret.txt; \
		else \
			echo "WARNING: google_client_secret is a random placeholder - Google login will NOT work until you replace it."; \
			openssl rand -hex 16 | tr -d '\r\n' > secrets/google_client_secret.txt; \
		fi; \
		chmod 644 secrets/google_client_secret.txt; \
	fi
	@for f in db_password jwt_secret redis_password minio_root_password grafana_admin_password mail_password google_client_secret; do \
		[ -s "secrets/$$f.txt" ] || { echo "Missing or empty secrets/$$f.txt"; exit 1; }; \
	done

certs:
	@chmod +x generate_certs.sh
	@./generate_certs.sh

ps:
	docker compose --env-file $(ENV_FILE) ps -a

clean:
	docker compose --env-file $(ENV_FILE) down -v

fclean:
	docker compose --env-file $(ENV_FILE) down -v --rmi local
	rm -rf secrets
	rm -rf ./nginx/certs
	rm -f .env

re: fclean all