cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
APPLICATION_SERVER_TOKEN="this is the token" \
APPLICATION_SERVER="http://localhost:8200" \
DASHBOARD_SERVER="localhost:8882" \
PORT=8200 \
HOST=0.0.0.0 \
node main.js 
