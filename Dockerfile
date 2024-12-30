# ---------------------
# 1) BUILD STAGE
# ---------------------
    FROM node:18-alpine AS build

    WORKDIR /app
    
    # Install dependencies
    COPY package.json package-lock.json ./
    RUN npm install
    
    # Copy the rest of your Svelte code
    COPY . .
    
    # Build the SvelteKit project (static output in /app/build)
    RUN npm run build
    
    # ---------------------
    # 2) PRODUCTION STAGE
    # ---------------------
        
    FROM nginx:1.25-alpine
    
    # Copy the static build from the "build" stage
    COPY --from=build /app/build /usr/share/nginx/html
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Listen on port 80 inside the container
    EXPOSE 80
    
    # Run Nginx in the foreground
    CMD ["nginx", "-g", "daemon off;"]