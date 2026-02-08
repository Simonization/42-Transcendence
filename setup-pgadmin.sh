#!/bin/bash

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# get .env file data or use default if env file doesn't exist ({DATA_IN_ENV_FILE':-defaultData'})
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-user}
DB_PASSWORD=${DB_PASSWORD:-password}
DB_DATABASE=${DB_DATABASE:-transcendence_db}
DB_TYPE=${DB_TYPE:-postgres}
DB_SYNCHRONIZE=${DB_SYNCHRONIZE:-true}
JWT_SECRET=${JWT_SECRET:-super-secret-jwt-key-change-in-production}
JWT_EXPIRATION=${JWT_EXPIRATION:-24h}
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-3000}
MAIL_HOST=${MAIL_HOST:-smtp.gmail.com}
MAIL_PORT=${MAIL_PORT:-587}
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_FROM=${MAIL_FROM}
FRONTEND_URL=${FRONTEND_URL:-http://localhost}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}


# create env file for backend
cat > backend/.env <<EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=${DB_DATABASE}
DB_TYPE=${DB_TYPE}
DB_SYNCHRONIZE=${DB_SYNCHRONIZE}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=${JWT_EXPIRATION}

NODE_ENV=${NODE_ENV}
PORT=${PORT}

MAIL_HOST=${MAIL_HOST}
MAIL_PORT=${MAIL_PORT}
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASSWORD}
MAIL_FROM=${MAIL_FROM}

FRONTEND_URL=${FRONTEND_URL}
BACKEND_URL=${BACKEND_URL}

GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
EOF

# create pgAdmin json to access db
cat > pgadmin-servers.json <<EOF
{
  "Servers": {
    "1": {
      "Name": "Transcendence DB",
      "Group": "Servers",
      "Host": "${DB_HOST}",
      "Port": ${DB_PORT},
      "MaintenanceDB": "${DB_DATABASE}",
      "Username": "${DB_USERNAME}",
      "SSLMode": "prefer",
      "PassFile": "/pgpass"
    }
  }
}
EOF

# create pgAdmin auto login
cat > pgadmin-pgpass <<EOF
${DB_HOST}:${DB_PORT}:*:${DB_USERNAME}:${DB_PASSWORD}
EOF

chmod 600 pgadmin-pgpass
