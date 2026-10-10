#!/bin/sh

set -e

for var_file in $(env | grep '_FILE=' | cut -d= -f1); do
  var_name="${var_file%_FILE}"
  file_path="$(eval echo \$"$var_file")"
  export "$var_name"="$(cat "$file_path")"
  unset "$var_file"
done

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' -- "$1"
}

DB_USERNAME_ENC="$(urlencode "$DB_USERNAME")"
DB_PASSWORD_ENC="$(urlencode "$DB_PASSWORD")"

export DATABASE_URL="postgresql://${DB_USERNAME_ENC}:${DB_PASSWORD_ENC}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA:-chat}"

if [ -n "$REDIS_PASSWORD" ]; then
  REDIS_PASSWORD_ENC="$(urlencode "$REDIS_PASSWORD")"
  export REDIS_URL="redis://:${REDIS_PASSWORD_ENC}@${REDIS_HOST:-redis}:${REDIS_PORT:-6379}"
fi

exec "$@"
