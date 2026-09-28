

all: secrets
	chmod +x generate_certs.sh
	./generate_certs.sh
	docker compose up -d --build

secrets:
	@mkdir -p secrets
	@for example in secrets_example/*.txt.example; do \
		target="secrets/$$(basename "$$example" .example)"; \
		if [ ! -f "$$target" ]; then \
			tr -d '\r\n' < "$$example" > "$$target"; \
			chmod 600 "$$target"; \
		fi; \
	done

ps:
	docker ps -a

clean:
	docker compose down

fclean:
	rm -rf secrets
	rm -rf ./nginx/certs
	docker compose down

backend:
	docker compose up -d --build backend

re: fclean all

