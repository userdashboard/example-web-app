# To run the tests on linux you may need to install [dependencies for Chrome](https://stackoverflow.com/questions/59112956/cant-use-puppeteer-error-failed-to-launch-chrome):
# sudo apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

if [ ! -d node_modules/puppeteer ]; then
  npm install puppeteer --no-save
fi
PARAMS=""
if [ ! -z "$1" ]; then
  PARAMS="$PARAMS -- --grep $1"
fi

FAST_START=true \
DASHBOARD_SERVER="http://localhost:8207" \
DOMAIN="localhost:8207" \
APPLICATION_SERVER="http://localhost:8213" \
APPLICATION_SERVER_TOKEN="this is the token" \
PORT=8207 \
STORAGE_PATH=/tmp/test-data \
ENCRYPTION_SECRET=12345678901234567890123456789012 \
ENCRYPTION_SECRET_IV=1234123412341234 \
GENERATE_SITEMAP_TXT=false \
GENERATE_API_TXT=false \
npm test $PARAMS
