#!/bin/sh

set -e

for var_file in $(env | grep '_FILE=' | cut -d= -f1); do
  var_name="${var_file%_FILE}"
  file_path="$(eval echo \$"$var_file")"
  export "$var_name"="$(cat "$file_path")"
  unset "$var_file"
done

export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA:-chat}"

exec "$@"
