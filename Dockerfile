FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY . .
RUN node scripts/check-seo.cjs && node scripts/check-download.cjs
USER node
EXPOSE 8080
CMD ["node", "scripts/serve.cjs"]
