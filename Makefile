YML_FILE := "docker-compose.yml"

ifneq ($(shell docker compose version >/dev/null 2>&1 && echo ok),)
    CMD := docker compose
else ifneq ($(shell docker-compose version >/dev/null 2>&1 && echo ok),)
    CMD := docker-compose
else
    $(error Please install Docker Compose)
endif

all: up

re: down up

up:
	$(CMD) -f $(YML_FILE) up

down:
	$(CMD) -f $(YML_FILE) down

# WARNING /!\ this command delete containers, networks and volumes of the docker compose file /!\ WARNING
fclean:
	$(CMD) -f $(YML_FILE) down -v 

# WARNING /!\ this command local docker image and volumes /!\ WARNING
fcleanall: fclean
	$(CMD) -f $(YML_FILE) down --rmi local

.PHONY: up down fclean fcleanall