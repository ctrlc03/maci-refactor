# maci-cli

A package that can be used to interact with MACI.

# Test

To run tests, simply run `bun test`.

# Usage 

| Command | Syntax | Description | Arguments
| --- | --- | --- | --- |
| genMaciKeyPair | `bun run src/index.ts genMaciKeyPair` | Generates a key pair for use with MACI | None |
| genMaciPubKey | `bun run src/index.ts genMaciPubKey` | Generate a MACI public key from a private key | `-sk --privKey`| 