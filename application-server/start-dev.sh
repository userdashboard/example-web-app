cd "$(dirname "$0")"
npm install &&
APPLICATION_SERVER_TOKEN="this is the token" \
APPLICATION_SERVER="http://localhost:8213" \
DASHBOARD_SERVER="http://localhost:8207" \
APPLICATION_SERVER_PORT=8213 \
MAX_LENGTH=9999999 \
node main.js 
