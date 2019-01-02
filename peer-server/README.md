# Peery P2P Server

Peery P2P server that connects peers to each other.

## Running the Server

We use Docker to build the server:

```
docker build -t p2p-server .
```

And then run it:

```
docker run -d -p ${PORT:=9000}:${PORT:=9000} p2p-server
```

## Testing

Tests are written using Mocha, which can be found in the folder `test/`.

Just run `mocha test` or `npm run test` to run the tests.

## License

MIT