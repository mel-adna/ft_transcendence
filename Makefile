

all:
	docker compose up -d --build

ps:
	docker ps -a

fclean:
	docker compose down -v


re: fclean all

