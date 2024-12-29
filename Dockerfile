FROM node:18-alpine

WORKDIR /app

# Copy dependencies & install
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Build the SvelteKit project
RUN npm run build

# Expose the port that `npm run preview` will listen on (default 4173)
EXPOSE 5173

# Start the app
CMD ["npm", "run", "preview"]
