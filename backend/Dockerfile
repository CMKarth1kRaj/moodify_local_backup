FROM alpine:latest

ARG PB_VERSION=0.37.5

RUN apk add --no-cache \
    unzip \
    ca-certificates

# Download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Copy the migrations and schema if they exist
COPY ./pb_migrations /pb/pb_migrations
COPY ./pb_schema.json /pb/pb_schema.json

WORKDIR /pb

RUN chmod +x /pb/pocketbase

EXPOSE 8080

# Start PocketBase (Creates a temp admin then starts the server)
CMD ["sh", "-c", "./pocketbase admin create admin@moodify.com moodify12345 || true && ./pocketbase serve --http=0.0.0.0:${PORT:-8080}"]
