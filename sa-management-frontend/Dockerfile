# Create this file as: ./frontend.Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for better network handling
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Configure npm for better network handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set timeout 120000 && \
    npm config set fetch-timeout 120000 && \
    npm config set network-timeout 120000 && \
    npm config set retry-times 5 && \
    npm config set retry-min-timeout 10000

# Copy package files first (for better Docker layer caching)
COPY sa-management-frontend/package*.json ./

# Install dependencies with retry logic
RUN for i in 1 2 3 4 5; do \
        echo "Attempt $i of 5..." && \
        npm cache clean --force && \
        if [ -f "package-lock.json" ]; then \
            npm ci --prefer-offline --no-audit --no-fund && break; \
        else \
            npm install --no-audit --no-fund && break; \
        fi || \
        (echo "Attempt $i failed, retrying in 10 seconds..." && sleep 10); \
    done

# Copy the rest of the application
COPY sa-management-frontend/ ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start", "--", "--host", "0.0.0.0"]