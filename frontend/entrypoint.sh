#!/bin/bash

cd /usr/share/nginx/html
source /root/.bashrc
yarn run build
nginx -g "daemon off;"

