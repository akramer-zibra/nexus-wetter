# nexus

## Development

To install dependencies: `bun install` 

To run: `bun run --watch serve.ts` 

This project was created using `bun init` in bun v1.1.27. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Deploy

Build a docker image: `docker build -t nexus-wetter .` 

Run a docker container of this: `docker run --rm -p 3000:3000 nexus-wetter`

## API 

Read swagger API docs: e.g. `localhost:3000/swagger`