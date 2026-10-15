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
	@for example in secrets_example/*.txt.example; do \
		if [ -f "$$example" ]; then \
			target="secrets/$$(basename "$$example" .example)"; \
			if [ ! -f "$$target" ]; then \
				echo "Creating $$target..."; \
				tr -d '\r\n' < "$$example" > "$$target"; \
				chmod 600 "$$target"; \
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