FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY server.js ./
COPY services ./services
COPY auth ./auth

# Expose port
EXPOSE 8080

# Start
CMD ["npm", "start"]