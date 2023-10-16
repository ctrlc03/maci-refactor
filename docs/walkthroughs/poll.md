# Maci Poll

## What happens when someone publishes a message

### Typescript version 

1. Call `publishMessage` with the message and the encryption public key 
2. Validation:
    * Message type must be 1 
    * the key must be within the baby jubjub curve
    * the message data must be within the baby jubjub curve
3. store the message and the key 
4. the message leaf equals to the hash of the message and the key
5. in the message trees we store this message leaf 
6. Generate a ECDH shared key to decrypt the message
7. Decrypt the message and store it in a commands array locally:
    * if an error decrypting, store an empty message 

### Smart contract

@todo 

### How does the message processing work

### Typescript implementation

1. Call `processMessage` with the message index 
2. Validation:
    * valid index (>= 0 and <= the number of messages)
    * we want to ensure that we have the same amount of messages and keys (this is an invariant of the protocol, when we add a message, we MUST add the key used to encrypt it)
3. Generate the shared key (we use coordinator's private key and the public key used to encrypt the message)
4. Decrypt the message (we could have an error here):
    * if there is an error decrypting this we throw an error which is caught by the outer function 
5. With the decrypted message in hand, we check that the state index is valid:
    * it's less than the number of total ballots
    * it's at least 1 (0 state index is a default leaf)
    * it's not greater or equal than the next state index in the state tree
6. We verify the signature of the message
7. We ensure that the nonce is valid:
    * the nonce of the command should be equal to the nonce of the ballot + 1 (@todo explain why - point 10)
8. Calculate the voice credits left after this vote:
    * @todo we need to properly understand the formula 
    * we ensure that whatever is left is not less than 0
9. We calculate the new state leaf:
    * this has the updated voice credits left
    * this has the new public key (if any)
10. We calculate the new ballot:
    * the nonce is incremented by 1
    * we add the vote from this message we are processing
11. Create a new vote option tree:
    * @todo a bit unclear on this step 

### zk-SNARK circuit

@todo 