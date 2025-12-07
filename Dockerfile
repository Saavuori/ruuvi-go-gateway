# Stage 1: Build the frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
# Next.js export requires this
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Build the backend and embed frontend
FROM golang:1.23-alpine AS backend-builder
ARG VERSION="unknown-docker"
WORKDIR /app

# Copy Go module files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Copy the built frontend assets from the previous stage to where Go expects them
COPY --from=frontend-builder /app/web/out ./web/out

# Build the binary
ARG TARGETOS
ARG TARGETARCH
# Build the binary with proper cross-compilation support
RUN MODULE=$(go list -m) && \
    GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags "-X ${MODULE}/common/version.Version=${VERSION}" \
    -o /go/bin/ruuvi-go-gateway ./cmd/ruuvi-go-gateway

# Stage 3: Final lightweight image
FROM alpine:latest
WORKDIR /app
COPY --from=backend-builder /go/bin/ruuvi-go-gateway .
# Copy a default config sample if needed, or expect user to mount it
COPY config.sample.yml ./config.yml

# Check if verification_config.yml exists locally and copy it if you want it in the image, 
# but usually config is mounted. We'll leave it as just the binary and sample.

EXPOSE 8080
CMD ["./ruuvi-go-gateway"]
