#!/bin/bash

cd "$(dirname "$0")"

git pull

docker-compose build
docker-compose up -d
