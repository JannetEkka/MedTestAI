FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all backend files
COPY server.js ./
COPY services ./services
COPY middleware ./middleware
COPY utils ./utils

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["npm", "start"]