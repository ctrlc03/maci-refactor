# Minimal Anti-Collusion Infrastructure

[![CI][cli-actions-badge]][cli-actions-link]
![License](https://img.shields.io/badge/license-MIT-green)
[![Telegram][telegram-badge]][telegram-link]

Please refer to
the original [ethresear.ch
post](https://ethresear.ch/t/minimal-anti-collusion-infrastructure/5413) for a
high-level view.

Documentation for developers and integrators can be found here:
https://privacy-scaling-explorations.github.io/maci/

We welcome contributions to this project. Please join our
[Telegram group][telegram-link] to discuss.

## Local Development and testing

### Requirements

You should have Node 16 (or 18) installed. Use `nvm` to install it and manage versions.

### Get started

Install dependencies:
`sudo apt-get install build-essential libgmp-dev libssl-dev libsodium-dev git nlohmann-json3-dev nasm g++ libgcc-s1`

If you are missing the correct version of glibc see `circuits/scripts/installGlibc.sh`

Clone this repository, install [**bun**](https://bun.sh/), and install the dependencies:

```bash
bun install
```

#### Compiling Circom

@todo

### Testing

### Unit tests

To run unit tests, please run:

`bun test`

### Smart contract tests

To run smart contract tests, please use the following commands:

1. `cd packages/contracts`
2. `bun run test`
