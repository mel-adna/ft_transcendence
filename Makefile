

all:
	chmod +x generate_certs.sh
	./generate_certs.sh
	docker compose up -d --build

ps:
	docker ps -a

fclean:
	rm -rf ./nginx/certs
	docker compose down -v

backend:
	docker compose up -d --build backend

re: fclean all

