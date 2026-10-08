#!/bin/sh

set -e

for var_file in $(env | grep '_FILE=' | cut -d= -f1); do
  var_name="${var_file%_FILE}"
  if [ -n "$(eval echo \$"$var_name")" ]; then
    echo "docker-entrypoint-secrets: both $var_name and $var_file are set — refusing to start" >&2
    exit 1
  fi
  file_path="$(eval echo \$"$var_file")"
  if [ ! -r "$file_path" ]; then
    echo "docker-entrypoint-secrets: cannot read $file_path for $var_name" >&2
    exit 1
  fi
  export "$var_name"="$(cat "$file_path")"
  unset "$var_file"
done

exec "$@"
