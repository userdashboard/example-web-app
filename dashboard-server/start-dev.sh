cd "$(dirname "$0")"

APPLICATION_SERVER_TOKEN="this is the token" \
APPLICATION_SERVER="http://localhost:8200" \
DASHBOARD_SERVER="http://localhost:8207" \
DOMAIN="localhost:8207" \
PORT=8207 \
IP=0.0.0.0 \
GENERATE_API_TXT=false \
node main.js 
