# Revisador rapido para casos clinicos generados

## Para reiniciar anotaciones:
X `rm -rf data/correcciones/* data/correctas/* data/incompletos/* data/pendientes/*; cp data/reg/*.json data/pendientes/`
V `docker-compose run --rm reset-data`

## Up y stop
Add git PAT (.env)
`docker-compose up --build -d`
`docker-compose up -d`
`docker-compose stop`
`docker-compose down --rmi all --volumes --remove-orphans`