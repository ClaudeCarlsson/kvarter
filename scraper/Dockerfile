FROM oven/bun:1 AS base
WORKDIR /app

# Install system deps for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnspr4 libnss3 libnss3-tools libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libatspi2.0-0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    fonts-liberation fonts-noto-color-emoji curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN bun install

# Install Playwright Chromium
RUN bunx playwright install chromium

COPY scraper-server.ts ./

EXPOSE 3001
CMD ["bun", "run", "scraper-server.ts"]
