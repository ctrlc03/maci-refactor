# Introduction

Minimum Anti-Collusion Infrastructure (MACI) is a base layer for
bribery-resistant, secure, and private digital voting.

Applications like [clr.fund](https://clr.fund/) build atop MACI to increase
privacy and discourage bribery for public goods funding.

MACI offers the following guarantees:

* **Collusion resistance**: no-one except a trusted coordinator should be
  certain of the validity of a vote, reducing the effectiveness of bribery.
* **Receipt-freeness**: no-one voter prove (besides to the coordinator) which
  way they voted.
* **Privacy**: no-one except a trusted coordinator should be able to decrypt a
  vote.
* **Uncensorability**: no-one — not even the trusted coordinator — should be
  able to censor a vote.
* **Unforgeability**: only the owner of a user's private key may cast a vote
  tied to its corresponding public key.
* **Non-repudiation**: no-one may modify or delete a vote after it is cast,
  although a user may cast another vote to nullify it.
* **Correct execution**: no-one — not even the trusted coordinator — should be
  able to produce a false tally of votes.
* **Anonymity**: no-one — not even the trusted coordinator — should be
  able to deduce how the user voted.

Under the hood, MACI uses Ethereum smart contracts and zero-knowledge proofs.
It inherits security and uncensorability from the underlying Ethereum
blockchain, ensures unforgeability via asymmetric encryption, and achieves
collusion resistance, privacy, and correct execution via zk-SNARK proofs.

Although MACI can provide collusion resistance only if the coordinator is
honest, a dishonest coordinator can neither censor nor tamper with its
execution.

Note that MACI presumes an identity system where each legitimate member
controls a unique Ethereum private key.

MACI was originally proposed by Vitalik Buterin in [this ethresear.ch
post](https://ethresear.ch/t/minimal-anti-collusion-infrastructure/5413).

## Credits

- [Barry WhiteHat](https://github.com/barryWhiteHat)
- [Cory Dickson](https://github.com/corydickson)
- [Chih-Cheng Liang](https://twitter.com/ChihChengLiang)
- [Han Jian](https://han0110.github.io/)
- [Kendrick Tan](https://kndrck.co/)
- [Kirill Goncharov](https://github.com/xuhcc)
- [Kobi Gurkan](http://kobi.one/)
- [Koh Wei Jie](https://kohweijie.com)
- [Samuel Gosling](https://twitter.com/xGozzy)
- [ctrlc03](https://twitter.com/ctrlc03)
- [Chao](https://github.com/chaosma)
- [Daehyun Paik](https://github.com/gurrpi)
