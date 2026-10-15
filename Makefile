.PHONY: all env secrets certs ps clean fclean backend re


ENV_FILE := $(shell if [ -f .env ]; then echo ".env"; else echo ".env.example"; fi)


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
	@if [ ! -f secrets/jwt_secret.txt ]; then \
		echo "Generating random valid Base64 JWT secret..."; \
		openssl rand -base64 48 | tr -d '\r\n' > secrets/jwt_secret.txt; \
		chmod 600 secrets/jwt_secret.txt; \
	fi
	@for secret in db_password redis_password minio_root_password grafana_admin_password; do \
		if [ ! -f "secrets/$$secret.txt" ]; then \
			echo "Generating random $$secret..."; \
			openssl rand -hex 16 | tr -d '\r\n' > "secrets/$$secret.txt"; \
			chmod 600 "secrets/$$secret.txt"; \
		fi; \
	done
	@for external in mail_password google_client_secret; do \
		if [ ! -f "secrets/$$external.txt" ]; then \
			if [ -f "secrets_example/$$external.txt.example" ]; then \
				echo "Copying template for $$external..."; \
				tr -d '\r\n' < "secrets_example/$$external.txt.example" > "secrets/$$external.txt"; \
				chmod 600 "secrets/$$external.txt"; \
			fi; \
		fi; \
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

backend:
	docker compose --env-file $(ENV_FILE) up -d --build backend

re: fclean all