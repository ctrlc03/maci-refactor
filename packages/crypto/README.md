# maci-crypto

This package contains a number of cryptographic utilities used by MACI.

## AccQueue

AccQueue is an implementation of an Accumulator Queue. This is used to manage a queue of elements in  merkle-tree like structure. This TypeScript class conforms with the smart contract impemented in *maci-contracts* - AccQueue.sol. 

The main tree is divided into subtrees to allow for easier management. Each of the subtrees has its own root and leaves, with the depth being defined by the *subDepth* property of the AccQueue class.

When a new leaf is "enqued", this is actually added to the current subtree. If this is full, we calculate the root of the subtree and store it, while the new leaf is added to the next subtree. 

The use of subtrees allows to more efficiently fill the tree, where instead of computing the root each time a new leaf is added, we only need to compute the root of the subtrees.

## Crypto 

