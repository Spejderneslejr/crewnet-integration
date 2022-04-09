# CrewNet test integration

Testing out a number of endpoints.

## Installation

```bash
# Initial install
$ npm install
```

## Running the app

First make sure to populate the .env with a working api-key.

We're primarily using a CLI, so we're not launching a server, only building or
watching changes and then triggering a build

```bash
# continuous local build
$ npm run build:watch

# also watch for linting issues
$ npm run lint:watch

# Run commands
$ npm run cli --
# Run specific command
$ npm run cli -- events:list
```
