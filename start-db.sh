#!/bin/bash
# Starts the local PostgreSQL instance for DishBoard development

PGDATA_DIR="$(cd "$(dirname "$0")" && pwd)/pgdata"
PGRUN_DIR="$PGDATA_DIR/run"

mkdir -p "$PGRUN_DIR"

echo "Starting PostgreSQL from: $PGDATA_DIR"
exec postgres -D "$PGDATA_DIR" -k "$PGRUN_DIR" -p 5433 -h 127.0.0.1
