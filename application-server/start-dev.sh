cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
APPLICATION_SERVER_TOKEN="this is the token" \
APPLICATION_SERVER="http://localhost:8213" \
DASHBOARD_SERVER="http://localhost:8207" \
APPLICATION_SERVER_PORT=8213 \
MAX_LENGTH=9999999 \
HOT_RELOAD=true \
node main.js 
