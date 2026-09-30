YML_FILE := "docker-compose.yml"

ifneq ($(shell docker compose version >/dev/null 2>&1 && echo ok),)
    CMD := docker compose
else ifneq ($(shell docker-compose version >/dev/null 2>&1 && echo ok),)
    CMD := docker-compose
else
    $(error Please install Docker Compose)
endif

all: up

setup:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@bash setup-pgadmin.sh
	@if [ ! -f nginx/ssl/transcendence.key ] || [ ! -f nginx/ssl/transcendence.crt ]; then \
		echo "Generating self-signed localhost dev cert (nginx/ssl/)..."; \
		mkdir -p nginx/ssl; \
		openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
			-keyout nginx/ssl/transcendence.key -out nginx/ssl/transcendence.crt \
			-subj "/CN=localhost"; \
	fi

re: down up

up: setup
	$(CMD) -f $(YML_FILE) up

dev: setup
	$(CMD) -f $(YML_FILE) up --build

down:
	$(CMD) -f $(YML_FILE) down

# WARNING /!\ this command delete containers, networks and volumes of the docker compose file /!\ WARNING
fclean:
	$(CMD) -f $(YML_FILE) down -v 
	@rm -f pgadmin-servers.json pgadmin-pgpass backend/.env

# WARNING /!\ this command local docker image and volumes /!\ WARNING
fcleanall:
	$(CMD) -f $(YML_FILE) down -v --rmi local
	@rm -f pgadmin-servers.json pgadmin-pgpass backend/.env

.PHONY: all setup up down fclean fcleanall re
