# To run the tests on linux you may need to install [dependencies for Chrome](https://stackoverflow.com/questions/59112956/cant-use-puppeteer-error-failed-to-launch-chrome):
# sudo apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

NODE_ENV=testing \
FAST_START=true \
DASHBOARD_SERVER="http://localhost:9000" \
PORT=9000 \
DOMAIN="localhost" \
GENERATE_SITEMAP_TXT=false \
GENERATE_API_TXT=false \
GENERATE_RESPONSE=true \
GENERATE_SCREENSHOTS=true \
RESPONSE_PATH="/tmp/documentation" \
SCREENSHOT_PATH="/tmp/documentation/screenshots" \
SCREENSHOT_LANGUAGES="en" \
APPLICATION_SERVER="http://localhost:9213" \
APPLICATION_SERVER_PORT=9213 \
APPLICATION_SERVER_TOKEN="this is the token" \
START_APPLICATION_SERVER="false" \
STORAGE="@userdashboard/storage-redis" \
REDIS_URL="redis://localhost:6379" \
LOG_LEVEL="info,error,warn,log" \
mocha --file temp.js --bail --exit --full-trace --timeout 90000000 screenshots.test.js

