FROM node:18-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S medtestai -u 1001

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .
RUN chown -R medtestai:nodejs /app

# Run as non-root user
USER medtestai

EXPOSE 3000
CMD ["npm", "start"]
