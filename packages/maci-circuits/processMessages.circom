pragma circom 2.0.0;
include "./hasherSha256.circom";
include "./messageHasher.circom";
include "./messageToCommand.circom";
include "./newKeyMessageToCommand.circom";
include "./privToPubKey.circom";
include "./stateLeafAndBallotTransformer.circom";
include "./trees/incrementalQuinTree.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/smt/smtverifier.circom";
include "../node_modules/circomlib/circuits/smt/smtprocessor.circom";
include "./elGamalDecryption.circom";
include "./utils.circom";

/*
 * Proves the correctness of processing a batch of messages.
 */
template ProcessMessages(
    stateTreeDepth,
    msgTreeDepth,
    msgBatchDepth, // aka msgSubtreeDepth
    voteOptionTreeDepth
) {
    // stateTreeDepth: the depth of the state tree
    // msgTreeDepth: the depth of the message tree
    // msgBatchDepth: the depth of the shortest tree that can fit all the
    //                  messages in a batch
    // voteOptionTreeDepth: depth of the vote option tree

    assert(stateTreeDepth > 0);
    assert(msgBatchDepth > 0);
    assert(voteOptionTreeDepth > 0);
    assert(msgTreeDepth >= msgBatchDepth);

    var TREE_ARITY = 5;
    var batchSize = TREE_ARITY ** msgBatchDepth;

    var MSG_LENGTH = 12;
    var PACKED_CMD_LENGTH = 4;

    var STATE_LEAF_LENGTH = 4;
    var BALLOT_LENGTH = 2;

    var BALLOT_NONCE_IDX = 0;
    var BALLOT_VO_ROOT_IDX = 1;

    var STATE_LEAF_PUB_X_IDX = 0;
    var STATE_LEAF_PUB_Y_IDX = 1;
    var STATE_LEAF_VOICE_CREDIT_BALANCE_IDX = 2;
    var STATE_LEAF_TIMESTAMP_IDX = 3;
    
    // Note that we sha256 hash some values from the contract, pass in the hash
    // as a public input, and pass in said values as private inputs. This saves
    // a lot of gas for the verifier at the cost of constraints for the prover.

    //  ----------------------------------------------------------------------- 
    // The only public input, which is the SHA256 hash of a values provided
    // by the contract
    signal input inputHash;
    signal input packedVals;

    signal numSignUps;
    signal maxVoteOptions;

    signal input pollEndTimestamp;
    // The existing message root
    signal input msgRoot;

    // The messages
    signal input msgs[batchSize][MSG_LENGTH];

    // The message leaf Merkle proofs
    signal input msgSubrootPathElements[msgTreeDepth - msgBatchDepth][TREE_ARITY - 1];

    // The index of the first message leaf in the batch, inclusive. Note that
    // messages are processed in reverse order, so this is not be the index of
    // the first message to process (unless there is only 1 message)
    signal batchStartIndex;

    // The index of the last message leaf in the batch to process, exclusive.
    // This value may be less than batchStartIndex + batchSize if this batch is
    // the last batch and the total number of mesages is not a multiple of the
    // batch size.
    signal batchEndIndex;

    // The coordinator's private key
    signal input coordPrivKey;

    // The cooordinator's public key from the contract.
    signal input coordPubKey[2];

    // The ECDH public key per message
    signal input encPubKeys[batchSize][2];

    // The state root before it is processed
    signal input currentStateRoot;

    // The nullifier root before it is processed
    signal input currentNullifierRoot;

    // The state leaves upon which messages are applied.
    //     transform(currentStateLeaf[4], message5) => newStateLeaf4
    //     transform(currentStateLeaf[3], message4) => newStateLeaf3
    //     transform(currentStateLeaf[2], message3) => newStateLeaf2
    //     transform(currentStateLeaf[1], message1) => newStateLeaf1
    //     transform(currentStateLeaf[0], message0) => newStateLeaf0
    //     ...
    // Likewise, currentStateLeavesPathElements contains the Merkle path to
    // each incremental new state root.
    signal input currentStateLeaves[batchSize][STATE_LEAF_LENGTH];
    signal input currentStateLeavesPathElements[batchSize][stateTreeDepth][TREE_ARITY - 1];

    // Nullifier paths
    signal input currentNullifierLeavesPathElements[batchSize][stateTreeDepth];

    // Nullifier inclusion flags
    signal input nullifierInclusionFlags[batchSize];

    // Number of attempted new key generations
    signal input numKeyGens;

    // The salted commitment to the state root and ballot root
    signal input currentSbCommitment;
    signal input currentSbSalt;

    // The salted commitment to the new state root and ballot root
    signal input newSbCommitment;
    signal input newSbSalt;

    // The ballots before any messages are processed
    signal input currentBallotRoot;

    // Intermediate ballots, like currentStateLeaves
    signal input currentBallots[batchSize][BALLOT_LENGTH];
    signal input currentBallotsPathElements[batchSize][stateTreeDepth][TREE_ARITY - 1];

    signal input currentVoteWeights[batchSize];
    signal input currentVoteWeightsPathElements[batchSize][voteOptionTreeDepth][TREE_ARITY - 1];

    var msgTreeZeroValue = 8370432830353022751713833565135785980866757267633941821328460903436894336785;

    // Verify currentSbCommitment
    component currentSbCommitmentHasher = Hasher4(); 
    currentSbCommitmentHasher.in[0] <== currentStateRoot;
    currentSbCommitmentHasher.in[1] <== currentBallotRoot;
    currentSbCommitmentHasher.in[2] <== currentNullifierRoot;
    currentSbCommitmentHasher.in[3] <== currentSbSalt;
    currentSbCommitmentHasher.hash === currentSbCommitment;

    // Verify "public" inputs and assign unpacked values
    component inputHasher = ProcessMessagesInputHasher();
    inputHasher.packedVals <== packedVals;
    inputHasher.coordPubKey[0] <== coordPubKey[0];
    inputHasher.coordPubKey[1] <== coordPubKey[1];
    inputHasher.msgRoot <== msgRoot;
    inputHasher.currentSbCommitment <== currentSbCommitment;
    inputHasher.newSbCommitment <== newSbCommitment;
    inputHasher.pollEndTimestamp <== pollEndTimestamp;

    // The unpacked values from packedVals
    inputHasher.maxVoteOptions ==> maxVoteOptions;
    inputHasher.numSignUps ==> numSignUps;
    inputHasher.batchStartIndex ==> batchStartIndex;
    inputHasher.batchEndIndex ==> batchEndIndex;

    inputHasher.hash === inputHash;

    //  ----------------------------------------------------------------------- 
    //      0. Ensure that the maximum vote options signal is valid and whether
    //      the maximum users signal is valid
    component maxVoValid = LessEqThan(32);
    maxVoValid.in[0] <== maxVoteOptions;
    maxVoValid.in[1] <== TREE_ARITY ** voteOptionTreeDepth;
    maxVoValid.out === 1;

    component numSignUpsValid = LessEqThan(32);
    numSignUpsValid.in[0] <== numSignUps;
    numSignUpsValid.in[1] <== TREE_ARITY ** stateTreeDepth;
    numSignUpsValid.out === 1;

    // Hash each Message (along with the encPubKey) so we can check their
    // existence in the Message tree
    component messageHashers[batchSize];
    for (var i = 0; i < batchSize; i ++) {
        messageHashers[i] = MessageHasher();
        for (var j = 0; j < MSG_LENGTH - 1; j ++) {
            messageHashers[i].in[j] <== msgs[i][j];
        }
        messageHashers[i].encPubKey[0] <== encPubKeys[i][0];
        messageHashers[i].encPubKey[1] <== encPubKeys[i][1];
    }

    //  ----------------------------------------------------------------------- 
    //  Check whether each message exists in the message tree. Throw if
    //  otherwise (aka create a constraint that prevents such a proof).

    //  To save constraints, compute the subroot of the messages and check
    //  whether the subroot is a member of the message tree. This means that
    //  batchSize must be the message tree arity raised to some power
    // (e.g. 5 ^ n)

    component msgBatchLeavesExists = QuinBatchLeavesExists(msgTreeDepth, msgBatchDepth);
    msgBatchLeavesExists.root <== msgRoot;

    // If batchEndIndex - batchStartIndex < batchSize, the remaining
    // message hashes should be the zero value.
    // e.g. [m, z, z, z, z] if there is only 1 real message in the batch
    // This allows us to have a batch of messages which is only partially
    // full.
    component lt[batchSize];
    component muxes[batchSize];

    for (var i = 0; i < batchSize; i ++) {
        lt[i] = SafeLessThan(32);
        lt[i].in[0] <== batchStartIndex + i;
        lt[i].in[1] <== batchEndIndex;

        muxes[i] = Mux1();
        muxes[i].s <== lt[i].out;
        muxes[i].c[0] <== msgTreeZeroValue;
        muxes[i].c[1] <== messageHashers[i].hash;
        msgBatchLeavesExists.leaves[i] <== muxes[i].out;
    }

    for (var i = 0; i < msgTreeDepth - msgBatchDepth; i ++) {
        for (var j = 0; j < TREE_ARITY - 1; j ++) {
            msgBatchLeavesExists.path_elements[i][j] <== msgSubrootPathElements[i][j];
        }
    }

    // Assign values to msgBatchLeavesExists.path_index. Since
    // msgBatchLeavesExists tests for the existence of a subroot, the length of
    // the proof is the last n elements of a proof from the root to a leaf
    // where n = msgTreeDepth - msgBatchDepth
    // e.g. if batchStartIndex = 25, msgTreeDepth = 4, msgBatchDepth = 2
    // msgBatchLeavesExists.path_index should be:
    // [1, 0]
    component msgBatchPathIndices = QuinGeneratePathIndices(msgTreeDepth);
    msgBatchPathIndices.in <== batchStartIndex;
    for (var i = msgBatchDepth; i < msgTreeDepth; i ++) {
        msgBatchLeavesExists.path_index[i - msgBatchDepth] <== msgBatchPathIndices.out[i];
    }

    //  ----------------------------------------------------------------------- 
    //  Decrypt each Message to a Command

    // MessageToCommand derives the ECDH shared key from the coordinator's
    // private key and the message's ephemeral public key. Next, it uses this
    // shared key to decrypt a Message to a Command.

    // Ensure that the coordinator's public key from the contract is correct
    // based on the given private key - that is, the prover knows the
    // coordinator's private key.
    component derivedPubKey = PrivToPubKey();
    derivedPubKey.privKey <== coordPrivKey;
    derivedPubKey.pubKey[0] === coordPubKey[0];
    derivedPubKey.pubKey[1] === coordPubKey[1];

    // Decrypt each Message into a Command
    component commands[batchSize];
    component keyGenCommands[batchSize];
    for (var i = 0; i < batchSize; i ++) {
        commands[i] = MessageToCommand();
        commands[i].encPrivKey <== coordPrivKey;
        commands[i].encPubKey[0] <== encPubKeys[i][0];
        commands[i].encPubKey[1] <== encPubKeys[i][1];
        for (var j = 0; j < MSG_LENGTH - 1; j ++) {
            commands[i].message[j] <== msgs[i][j];
        }

        keyGenCommands[i] = NewKeyMessageToCommand();
        keyGenCommands[i].encPrivKey <== coordPrivKey;
        keyGenCommands[i].encPubKey[0] <== encPubKeys[i][0];
        keyGenCommands[i].encPubKey[1] <== encPubKeys[i][1];
        for (var j = 0; j < MSG_LENGTH - 1; j ++) {
            keyGenCommands[i].message[j] <== msgs[i][j];
        }
    }

    signal nullifierRoots[batchSize + 1];
    signal stateRoots[batchSize + 1];
    signal ballotRoots[batchSize + 1];

    stateRoots[batchSize] <== currentStateRoot;
    ballotRoots[batchSize] <== currentBallotRoot;
    nullifierRoots[batchSize] <== currentNullifierRoot;

    //  ----------------------------------------------------------------------- 
    //  Process messages in reverse order
    signal tmpStateRoot1[batchSize];
    signal tmpStateRoot2[batchSize];
    signal tmpStateRoot3[batchSize];
    signal tmpBallotRoot1[batchSize];
    signal tmpBallotRoot2[batchSize];
    component processors[batchSize]; // vote type processor
    component processors2[batchSize]; // topup type processor
    component processors3[batchSize]; // new key generation processor

    component isVoteMessage[batchSize];
    component isTopupMessage[batchSize];
    component isNewKeyGenMessage[batchSize];
    for (var i = batchSize - 1; i >= 0; i--) {
        // process it as vote type message
        processors[i] = ProcessOne(stateTreeDepth, voteOptionTreeDepth);

        processors[i].msgType <== msgs[i][0];
        processors[i].numSignUps <== numSignUps;
        processors[i].maxVoteOptions <== maxVoteOptions;
        processors[i].pollEndTimestamp <== pollEndTimestamp;

        processors[i].currentStateRoot <== stateRoots[i + 1];
        processors[i].currentBallotRoot <== ballotRoots[i + 1];

        processors[i].numKeyGens <== numKeyGens;

        for (var j = 0; j < STATE_LEAF_LENGTH; j ++) {
            processors[i].stateLeaf[j] <== currentStateLeaves[i][j];
        }

        for (var j = 0; j < BALLOT_LENGTH; j ++) {
            processors[i].ballot[j] <== currentBallots[i][j];
        }

        for (var j = 0; j < stateTreeDepth; j ++) {
            for (var k = 0; k < TREE_ARITY - 1; k ++) {

                processors[i].stateLeafPathElements[j][k] 
                    <== currentStateLeavesPathElements[i][j][k];

                processors[i].ballotPathElements[j][k]
                    <== currentBallotsPathElements[i][j][k];
            }
        }

        processors[i].currentVoteWeight <== currentVoteWeights[i];

        for (var j = 0; j < voteOptionTreeDepth; j ++) {
            for (var k = 0; k < TREE_ARITY - 1; k ++) {
                processors[i].currentVoteWeightsPathElements[j][k]
                    <== currentVoteWeightsPathElements[i][j][k];
            }
        }

        processors[i].cmdStateIndex <== commands[i].stateIndex;
        processors[i].topupStateIndex <== msgs[i][1];
        processors[i].keyGenStateIndex <== msgs[i][MSG_LENGTH - 1];
        processors[i].cmdNewPubKey[0] <== commands[i].newPubKey[0];
        processors[i].cmdNewPubKey[1] <== commands[i].newPubKey[1];
        processors[i].cmdVoteOptionIndex <== commands[i].voteOptionIndex;
        processors[i].cmdNewVoteWeight <== commands[i].newVoteWeight;
        processors[i].cmdNonce <== commands[i].nonce;
        processors[i].cmdPollId <== commands[i].pollId;
        processors[i].cmdSalt <== commands[i].salt;
        processors[i].cmdSigR8[0] <== commands[i].sigR8[0];
        processors[i].cmdSigR8[1] <== commands[i].sigR8[1];
        processors[i].cmdSigS <== commands[i].sigS;
        for (var j = 0; j < PACKED_CMD_LENGTH; j ++) {
            processors[i].packedCmd[j] <== commands[i].packedCommandOut[j];
        }

        // --------------------------------------------
        // process it as topup type message, 
        processors2[i] = ProcessTopup(stateTreeDepth);
        processors2[i].msgType <== msgs[i][0];
        processors2[i].stateTreeIndex <== msgs[i][1];
        processors2[i].amount <== msgs[i][2];
        processors2[i].numSignUps <== numSignUps;
        processors2[i].numKeyGens <== numKeyGens;

        for (var j = 0; j < STATE_LEAF_LENGTH; j ++) {
            processors2[i].stateLeaf[j] <== currentStateLeaves[i][j];
        }
        for (var j = 0; j < stateTreeDepth; j ++) {
            for (var k = 0; k < TREE_ARITY - 1; k ++) {
                processors2[i].stateLeafPathElements[j][k] 
                    <== currentStateLeavesPathElements[i][j][k];
            }
        }

        // --------------------------------------------
        // process it as new key generation type message
        processors3[i] = ProcessNewKeyGeneration(stateTreeDepth);
        processors3[i].newPubKey[0] <== keyGenCommands[i].newPubKey[0];
        processors3[i].newPubKey[1] <== keyGenCommands[i].newPubKey[1];
        processors3[i].newCreditBalance <== keyGenCommands[i].newCreditBalance;
        processors3[i].nullifier <== keyGenCommands[i].nullifier;
        processors3[i].c1r[0] <== keyGenCommands[i].c1r[0];
        processors3[i].c1r[1] <== keyGenCommands[i].c1r[1];
        processors3[i].c2r[0] <== keyGenCommands[i].c2r[0];
        processors3[i].c2r[1] <== keyGenCommands[i].c2r[1];
        processors3[i].pollId <== keyGenCommands[i].pollId;
        processors3[i].isValidStatus <== keyGenCommands[i].isValidStatus;

        for (var j = 0; j < stateTreeDepth; j++) {
            for (var k = 0; k < TREE_ARITY - 1; k++) {
                processors3[i].stateLeafPathElements[j][k] <== currentStateLeavesPathElements[i][j][k];
            }
        }

        processors3[i].coordPrivKey <== coordPrivKey;
        processors3[i].msgType <== msgs[i][0];
        
        processors3[i].cmdStateIndex <== commands[i].stateIndex;
        processors3[i].topupStateIndex <== msgs[i][1];
        processors3[i].keyGenStateIndex <== msgs[i][MSG_LENGTH - 1];
        processors3[i].numSignUps <== numSignUps;
        processors3[i].numKeyGens <== numKeyGens;
        processors3[i].currentStateRoot <== stateRoots[i + 1];

        for (var j = 0; j < stateTreeDepth; j++) {
            processors3[i].nullifierLeafPathElements[j] <== currentNullifierLeavesPathElements[i][j];
        }

        processors3[i].currentNullifierRoot <== nullifierRoots[i + 1];
        processors3[i].nullifierInclusionFlag <== nullifierInclusionFlags[i];

        isVoteMessage[i] = IsEqual();
        isVoteMessage[i].in[0] <== 1;
        isVoteMessage[i].in[1] <== msgs[i][0];

        isTopupMessage[i] = IsEqual();
        isTopupMessage[i].in[0] <== 2;
        isTopupMessage[i].in[1] <== msgs[i][0];

        isNewKeyGenMessage[i] = IsEqual();
        isNewKeyGenMessage[i].in[0] <== 3;
        isNewKeyGenMessage[i].in[1] <== msgs[i][0];

        // pick the correct result by msg type
        tmpStateRoot1[i] <== processors[i].newStateRoot * isVoteMessage[i].out; 
        tmpStateRoot2[i] <== processors2[i].newStateRoot * isTopupMessage[i].out;
        tmpStateRoot3[i] <== processors3[i].newStateRoot * isNewKeyGenMessage[i].out;

        tmpBallotRoot1[i] <== processors[i].newBallotRoot * isVoteMessage[i].out; 
        tmpBallotRoot2[i] <== ballotRoots[i+1] * (isTopupMessage[i].out + isNewKeyGenMessage[i].out);

        stateRoots[i] <== tmpStateRoot1[i] + tmpStateRoot2[i] + tmpStateRoot3[i];
        ballotRoots[i] <== tmpBallotRoot1[i] + tmpBallotRoot2[i];
        nullifierRoots[i] <== processors3[i].newNullifierRoot;
    }

    component sbCommitmentHasher = Hasher4();
    sbCommitmentHasher.in[0] <== stateRoots[0];
    sbCommitmentHasher.in[1] <== ballotRoots[0];
    sbCommitmentHasher.in[2] <== nullifierRoots[0];
    sbCommitmentHasher.in[3] <== newSbSalt;

    sbCommitmentHasher.hash === newSbCommitment;
}

template ProcessTopup(stateTreeDepth) {
    var STATE_LEAF_LENGTH = 4;
    var MSG_LENGTH = 12;
    var TREE_ARITY = 5;

    var STATE_LEAF_PUB_X_IDX = 0;
    var STATE_LEAF_PUB_Y_IDX = 1;
    var STATE_LEAF_VOICE_CREDIT_BALANCE_IDX = 2;
    var STATE_LEAF_TIMESTAMP_IDX = 3;

    signal input msgType;
    signal input stateTreeIndex;
    signal input amount;
    signal input numSignUps;
    signal input numKeyGens;

    signal input stateLeaf[STATE_LEAF_LENGTH];
    signal input stateLeafPathElements[stateTreeDepth][TREE_ARITY - 1];

    signal output newStateRoot;

    // skip state leaf verify, because it's checked in ProcessOne 

    component isValidMsgType = IsEqual();
    isValidMsgType.in[0] <== msgType;
    isValidMsgType.in[1] <== 2;

    signal amt;
    signal index;
    amt <== amount * isValidMsgType.out; 
    index <== stateTreeIndex * isValidMsgType.out;
    component validCreditBalance = LessEqThan(252);
    // check stateIndex, if invalid index, set index and amount to zero
    component validStateLeafIndex = LessEqThan(252);
    validStateLeafIndex.in[0] <== index;
    validStateLeafIndex.in[1] <== numSignUps + numKeyGens;

    component indexMux = Mux1();
    indexMux.s <== validStateLeafIndex.out;
    indexMux.c[0] <== 0;
    indexMux.c[1] <== index;

    component amtMux =  Mux1();
    amtMux.s <== validStateLeafIndex.out;
    amtMux.c[0] <== 0;
    amtMux.c[1] <== amt;
    

    // check less than field size
    signal newCreditBalance;
    newCreditBalance <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX] + amtMux.out;
    validCreditBalance.in[0] <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX];
    validCreditBalance.in[1] <== newCreditBalance;

    // update credit voice balance
    component newStateLeafHasher = Hasher4();
    newStateLeafHasher.in[STATE_LEAF_PUB_X_IDX] <== stateLeaf[STATE_LEAF_PUB_X_IDX];
    newStateLeafHasher.in[STATE_LEAF_PUB_Y_IDX] <== stateLeaf[STATE_LEAF_PUB_Y_IDX];
    newStateLeafHasher.in[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX] <== newCreditBalance;
    newStateLeafHasher.in[STATE_LEAF_TIMESTAMP_IDX] <== stateLeaf[STATE_LEAF_TIMESTAMP_IDX];

    component stateLeafPathIndices = QuinGeneratePathIndices(stateTreeDepth);
    stateLeafPathIndices.in <== indexMux.out;

    component newStateLeafQip = QuinTreeInclusionProof(stateTreeDepth);
    newStateLeafQip.leaf <== newStateLeafHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        newStateLeafQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            newStateLeafQip.path_elements[i][j] <== stateLeafPathElements[i][j];
        }
    }
    newStateRoot <== newStateLeafQip.root;
}

template ProcessNewKeyGeneration(stateTreeDepth) {
    var MSG_LENGTH = 12;
    var TREE_ARITY = 5;
    var STATE_LEAF_LENGTH = 4;
    var STATE_LEAF_PUB_X_IDX = 0;
    var STATE_LEAF_PUB_Y_IDX = 1;
    var STATE_LEAF_VOICE_CREDIT_BALANCE_IDX = 2;
    var STATE_LEAF_TIMESTAMP_IDX = 3;

    signal input newPubKey[2];
    signal input newCreditBalance;
    signal input nullifier;
    signal input c1r[2];
    signal input c2r[2];
    signal input pollId;
    signal input isValidStatus;

    signal input coordPrivKey;

    signal input msgType;
    signal input cmdStateIndex;
    signal input topupStateIndex;
    signal input keyGenStateIndex;
    signal input numSignUps;
    signal input currentStateRoot;
    signal input stateLeafPathElements[stateTreeDepth][TREE_ARITY - 1];
    signal input numKeyGens;

    signal input nullifierLeafPathElements[stateTreeDepth];
    signal input currentNullifierRoot;
    signal input nullifierInclusionFlag;

    signal output newNullifierRoot;
    signal output newStateRoot;

    signal indexByType;
    signal tmpIndex1;
    signal tmpIndex2;
    signal tmpIndex3;

    component isVoteType = IsEqual();
    isVoteType.in[0] <== 1;
    isVoteType.in[1] <== msgType;

    component isTopupType = IsEqual();
    isTopupType.in[0] <== 2;
    isTopupType.in[1] <== msgType;

    component isKeyGenType = IsEqual();
    isKeyGenType.in[0] <== 3;
    isKeyGenType.in[1] <== msgType;

    signal stateIndex;
    tmpIndex1 <== cmdStateIndex * isVoteType.out;
    tmpIndex2 <== topupStateIndex * isTopupType.out;
    tmpIndex3 <== keyGenStateIndex * isKeyGenType.out;
    stateIndex <== tmpIndex1 + tmpIndex2 + tmpIndex3;

    component validStateLeafIndex = LessEqThan(252);
    validStateLeafIndex.in[0] <== stateIndex;
    validStateLeafIndex.in[1] <== numSignUps + numKeyGens;

    component indexMux = Mux1();
    indexMux.s <== validStateLeafIndex.out;
    indexMux.c[0] <== 0;
    indexMux.c[1] <== stateIndex;

    component elGamalDecryption = ElGamalDecryptBit();
    elGamalDecryption.kG[0] <== c1r[0];
    elGamalDecryption.kG[1] <== c1r[1];
    elGamalDecryption.Me[0] <== c2r[0];
    elGamalDecryption.Me[1] <== c2r[1];
    elGamalDecryption.sk <== coordPrivKey;

    component validDeactivation = IsEqual();
    validDeactivation.in[0] <== elGamalDecryption.m;
    validDeactivation.in[1] <== 1;

    component stateLeafPathIndices = QuinGeneratePathIndices(stateTreeDepth);
    stateLeafPathIndices.in <== indexMux.out;

    component stateLeafQip = QuinTreeInclusionProof(stateTreeDepth);
    component stateLeafHasher = Hasher4();
    
    // Empty state leaf
    stateLeafHasher.in[0] <== 10457101036533406547632367118273992217979173478358440826365724437999023779287;
    stateLeafHasher.in[1] <== 19824078218392094440610104313265183977899662750282163392862422243483260492317;
    stateLeafHasher.in[2] <== 0;
    stateLeafHasher.in[3] <== 0;
    
    stateLeafQip.leaf <== stateLeafHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        stateLeafQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            stateLeafQip.path_elements[i][j] <== stateLeafPathElements[i][j];
        }
    }

    signal tmp1 <== (isKeyGenType.out) * currentStateRoot;
    signal tmp2 <== (1 - isKeyGenType.out) * stateLeafQip.root;
    stateLeafQip.root === tmp1 + tmp2;

    component nullifierTreeVerifier = SMTVerifier(stateTreeDepth);
    nullifierTreeVerifier.enabled <== 1;
    nullifierTreeVerifier.root <== currentNullifierRoot;

    for (var i = 0; i < stateTreeDepth; i++) {
        nullifierTreeVerifier.siblings[i] <== nullifierLeafPathElements[i];
    }

    signal valueFlag <== isKeyGenType.out * (1 - nullifierInclusionFlag);
    nullifierTreeVerifier.oldKey <== valueFlag * nullifier;
    nullifierTreeVerifier.oldValue <== valueFlag * nullifier;
    nullifierTreeVerifier.isOld0 <== 0;
    nullifierTreeVerifier.key <== isKeyGenType.out * nullifier;
    nullifierTreeVerifier.value <== isKeyGenType.out * nullifier;
    nullifierTreeVerifier.fnc <== nullifierInclusionFlag;

    component nullifierInsertProcessor = SMTProcessor(stateTreeDepth);
    nullifierInsertProcessor.oldRoot <== currentNullifierRoot;

    for (var i = 0; i < stateTreeDepth; i++) {
        nullifierInsertProcessor.siblings[i] <== nullifierLeafPathElements[i];
    }
    
    nullifierInsertProcessor.oldKey <== 0;
    nullifierInsertProcessor.oldValue <== 0;
    nullifierInsertProcessor.isOld0 <== 0;
    nullifierInsertProcessor.newKey <== nullifier;
    nullifierInsertProcessor.newValue <== nullifier;
    nullifierInsertProcessor.fnc[0] <== nullifierInclusionFlag;
    nullifierInsertProcessor.fnc[1] <== 0;

    signal validNullifier <== nullifierInclusionFlag * validDeactivation.out;
    signal tmp3 <== (1 - validNullifier) * currentNullifierRoot;
    signal tmp4 <== (validNullifier) * nullifierInsertProcessor.newRoot;

    newNullifierRoot <== tmp3 + tmp4;

    component newStateLeafHasher = Hasher4();

    newStateLeafHasher.in[STATE_LEAF_PUB_X_IDX] <== newPubKey[0];
    newStateLeafHasher.in[STATE_LEAF_PUB_Y_IDX] <== newPubKey[1];
    newStateLeafHasher.in[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX] <== newCreditBalance;
    newStateLeafHasher.in[STATE_LEAF_TIMESTAMP_IDX] <== 0;

    component newStateLeafQip = QuinTreeInclusionProof(stateTreeDepth);
    newStateLeafQip.leaf <== newStateLeafHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        newStateLeafQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            newStateLeafQip.path_elements[i][j] <== stateLeafPathElements[i][j];
        }
    }

    signal tmp5 <== (1 - validNullifier) * currentStateRoot;
    signal tmp6 <== (validNullifier) * newStateLeafQip.root;
    newStateRoot <== tmp5 + tmp6;
}

template ProcessOne(stateTreeDepth, voteOptionTreeDepth) {
    /*
        transform(currentStateLeaves0, cmd0) -> newStateLeaves0, isValid0
        genIndices(isValid0, cmd0) -> pathIndices0
        verify(currentStateRoot, pathElements0, pathIndices0, currentStateLeaves0)
        qip(newStateLeaves0, pathElements0) -> newStateRoot0
    */
    var STATE_LEAF_LENGTH = 4;
    var BALLOT_LENGTH = 2;
    var MSG_LENGTH = 12;
    var PACKED_CMD_LENGTH = 4;
    var TREE_ARITY = 5;

    var BALLOT_NONCE_IDX = 0;
    var BALLOT_VO_ROOT_IDX = 1;

    var STATE_LEAF_PUB_X_IDX = 0;
    var STATE_LEAF_PUB_Y_IDX = 1;
    var STATE_LEAF_VOICE_CREDIT_BALANCE_IDX = 2;
    var STATE_LEAF_TIMESTAMP_IDX = 3;

    signal input msgType;
    signal input numSignUps;
    signal input numKeyGens;
    signal input maxVoteOptions;

    signal input pollEndTimestamp;

    signal input currentStateRoot;
    signal input currentBallotRoot;

    signal input stateLeaf[STATE_LEAF_LENGTH];
    signal input stateLeafPathElements[stateTreeDepth][TREE_ARITY - 1];

    signal input ballot[BALLOT_LENGTH];
    signal input ballotPathElements[stateTreeDepth][TREE_ARITY - 1];

    signal input currentVoteWeight;
    signal input currentVoteWeightsPathElements[voteOptionTreeDepth][TREE_ARITY - 1];

    signal input cmdStateIndex;
    signal input topupStateIndex;
    signal input keyGenStateIndex;
    signal input cmdNewPubKey[2];
    signal input cmdVoteOptionIndex;
    signal input cmdNewVoteWeight;
    signal input cmdNonce;
    signal input cmdPollId;
    signal input cmdSalt;
    signal input cmdSigR8[2];
    signal input cmdSigS;
    signal input packedCmd[PACKED_CMD_LENGTH];

    signal output newStateRoot;
    signal output newBallotRoot;

    //  ----------------------------------------------------------------------- 
    // 1. Transform a state leaf and a ballot with a command.
    // The result is a new state leaf, a new ballot, and an isValid signal (0
    // or 1)
    component transformer = StateLeafAndBallotTransformer();
    transformer.numSignUps                     <== numSignUps + numKeyGens;
    transformer.maxVoteOptions                 <== maxVoteOptions;
    transformer.slPubKey[STATE_LEAF_PUB_X_IDX] <== stateLeaf[STATE_LEAF_PUB_X_IDX];
    transformer.slPubKey[STATE_LEAF_PUB_Y_IDX] <== stateLeaf[STATE_LEAF_PUB_Y_IDX];
    transformer.slVoiceCreditBalance           <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX];
    transformer.slTimestamp                    <== stateLeaf[STATE_LEAF_TIMESTAMP_IDX];
    transformer.pollEndTimestamp               <== pollEndTimestamp;
    transformer.ballotNonce                    <== ballot[BALLOT_NONCE_IDX];
    transformer.ballotCurrentVotesForOption    <== currentVoteWeight;
    transformer.cmdStateIndex                  <== cmdStateIndex;
    transformer.cmdNewPubKey[0]                <== cmdNewPubKey[0];
    transformer.cmdNewPubKey[1]                <== cmdNewPubKey[1];
    transformer.cmdVoteOptionIndex             <== cmdVoteOptionIndex;
    transformer.cmdNewVoteWeight               <== cmdNewVoteWeight;
    transformer.cmdNonce                       <== cmdNonce;
    transformer.cmdPollId                      <== cmdPollId;
    transformer.cmdSalt                        <== cmdSalt;
    transformer.cmdSigR8[0]                    <== cmdSigR8[0];
    transformer.cmdSigR8[1]                    <== cmdSigR8[1];
    transformer.cmdSigS                        <== cmdSigS;
    for (var i = 0; i < PACKED_CMD_LENGTH; i ++) {
        transformer.packedCommand[i]           <== packedCmd[i];
    }

    //  ----------------------------------------------------------------------- 
    // 2. If msgType = 0 and isValid is 0, generate indices for leaf 0
    //  Otherwise, generate indices for commmand.stateIndex or topupStateIndex depending on msgType
    signal indexByType;
    signal tmpIndex1;
    signal tmpIndex2;
    signal tmpIndex3;

    component isVoteType = IsEqual();
    isVoteType.in[0] <== 1;
    isVoteType.in[1] <== msgType;

    component isTopupType = IsEqual();
    isTopupType.in[0] <== 2;
    isTopupType.in[1] <== msgType;

    component isKeyGenType = IsEqual();
    isKeyGenType.in[0] <== 3;
    isKeyGenType.in[1] <== msgType;

    tmpIndex1 <== cmdStateIndex * isVoteType.out;
    tmpIndex2 <== topupStateIndex * isTopupType.out;
    tmpIndex3 <== keyGenStateIndex * isKeyGenType.out;
    indexByType <== tmpIndex1 + tmpIndex2 + tmpIndex3;

    component stateIndexMux = Mux1();
    stateIndexMux.s <== transformer.isValid * isVoteType.out;
    stateIndexMux.c[0] <== 0;
    stateIndexMux.c[1] <== indexByType;

    component stateLeafPathIndices = QuinGeneratePathIndices(stateTreeDepth);
    stateLeafPathIndices.in <== stateIndexMux.out;

    //  ----------------------------------------------------------------------- 
    // 3. Verify that the original state leaf exists in the given state root
    component stateLeafQip = QuinTreeInclusionProof(stateTreeDepth);
    component stateLeafHasher = Hasher4();
    for (var i = 0; i < STATE_LEAF_LENGTH; i++) {
        stateLeafHasher.in[i] <== stateLeaf[i];
    }
    stateLeafQip.leaf <== stateLeafHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        stateLeafQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            stateLeafQip.path_elements[i][j] <== stateLeafPathElements[i][j];
        }
    }

    signal tmp1 <== (isVoteType.out) * currentStateRoot;
    signal tmp2 <== (1 - isVoteType.out) * stateLeafQip.root;
    stateLeafQip.root === tmp1 + tmp2;

    //  ----------------------------------------------------------------------- 
    // 4. Verify that the original ballot exists in the given ballot root
    component ballotHasher = HashLeftRight();
    ballotHasher.left <== ballot[BALLOT_NONCE_IDX];
    ballotHasher.right <== ballot[BALLOT_VO_ROOT_IDX];

    component ballotQip = QuinTreeInclusionProof(stateTreeDepth);
    ballotQip.leaf <== ballotHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        ballotQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            ballotQip.path_elements[i][j] <== ballotPathElements[i][j];
        }
    }
    ballotQip.root === currentBallotRoot;

    //  ----------------------------------------------------------------------- 
    // 5. Verify that currentVoteWeight exists in the ballot's vote option root
    // at cmdVoteOptionIndex

    signal b;
    signal c;
    b <== currentVoteWeight * currentVoteWeight;
    c <== cmdNewVoteWeight * cmdNewVoteWeight;

    component enoughVoiceCredits = SafeGreaterEqThan(252);
    enoughVoiceCredits.in[0] <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX] + b;
    enoughVoiceCredits.in[1] <== c;

    component isMessageValid = IsEqual();
    var bothValid = 2; 
    isMessageValid.in[0] <== bothValid;
    isMessageValid.in[1] <== transformer.isValid + enoughVoiceCredits.out;

    component cmdVoteOptionIndexMux = Mux1();
    cmdVoteOptionIndexMux.s <== isMessageValid.out;
    cmdVoteOptionIndexMux.c[0] <== 0;
    cmdVoteOptionIndexMux.c[1] <== cmdVoteOptionIndex;

    component currentVoteWeightPathIndices = QuinGeneratePathIndices(voteOptionTreeDepth);
    currentVoteWeightPathIndices.in <== cmdVoteOptionIndexMux.out;

    component currentVoteWeightQip = QuinTreeInclusionProof(voteOptionTreeDepth);
    currentVoteWeightQip.leaf <== currentVoteWeight;
    for (var i = 0; i < voteOptionTreeDepth; i ++) {
        currentVoteWeightQip.path_index[i] <== currentVoteWeightPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            currentVoteWeightQip.path_elements[i][j] <== currentVoteWeightsPathElements[i][j];
        }
    }

    currentVoteWeightQip.root === ballot[BALLOT_VO_ROOT_IDX];

    component voteWeightMux = Mux1();
    voteWeightMux.s <== isMessageValid.out;
    voteWeightMux.c[0] <== currentVoteWeight;
    voteWeightMux.c[1] <== cmdNewVoteWeight;

    component newSlVoiceCreditBalance = Mux1();
    newSlVoiceCreditBalance.c[0] <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX];
    newSlVoiceCreditBalance.c[1] <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX] + b - c;
    newSlVoiceCreditBalance.s <== enoughVoiceCredits.out;

    component voiceCreditBalanceMux = Mux1();
    voiceCreditBalanceMux.s <== isMessageValid.out;
    voiceCreditBalanceMux.c[0] <== stateLeaf[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX];
    voiceCreditBalanceMux.c[1] <== newSlVoiceCreditBalance.out;

    //  ----------------------------------------------------------------------- 
    // 5.1. Update the ballot's vote option root with the new vote weight
    component newVoteOptionTreeQip = QuinTreeInclusionProof(voteOptionTreeDepth);
    newVoteOptionTreeQip.leaf <== voteWeightMux.out;
    for (var i = 0; i < voteOptionTreeDepth; i ++) {
        newVoteOptionTreeQip.path_index[i] <== currentVoteWeightPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            newVoteOptionTreeQip.path_elements[i][j] <== currentVoteWeightsPathElements[i][j];
        }
    }

    // The new vote option root in the ballot
    signal newBallotVoRoot;
    component newBallotVoRootMux = Mux1();
    newBallotVoRootMux.s <== isMessageValid.out;
    newBallotVoRootMux.c[0] <== ballot[BALLOT_VO_ROOT_IDX];
    newBallotVoRootMux.c[1] <== newVoteOptionTreeQip.root;
    newBallotVoRoot <== newBallotVoRootMux.out;

    //  ----------------------------------------------------------------------- 
    // 6. Generate a new state root
    component newStateLeafHasher = Hasher4();
    newStateLeafHasher.in[STATE_LEAF_PUB_X_IDX] <== transformer.newSlPubKey[STATE_LEAF_PUB_X_IDX];
    newStateLeafHasher.in[STATE_LEAF_PUB_Y_IDX] <== transformer.newSlPubKey[STATE_LEAF_PUB_Y_IDX];
    newStateLeafHasher.in[STATE_LEAF_VOICE_CREDIT_BALANCE_IDX] <== voiceCreditBalanceMux.out;
    newStateLeafHasher.in[STATE_LEAF_TIMESTAMP_IDX] <== stateLeaf[STATE_LEAF_TIMESTAMP_IDX];

    component newStateLeafQip = QuinTreeInclusionProof(stateTreeDepth);
    newStateLeafQip.leaf <== newStateLeafHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        newStateLeafQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            newStateLeafQip.path_elements[i][j] <== stateLeafPathElements[i][j];
        }
    }
    newStateRoot <== newStateLeafQip.root;

    //  ----------------------------------------------------------------------- 
    // 7. Generate a new ballot root
    
    component newBallotNonceMux = Mux1();
    newBallotNonceMux.s <== isMessageValid.out;
    newBallotNonceMux.c[0] <== ballot[BALLOT_NONCE_IDX];
    newBallotNonceMux.c[1] <== transformer.newBallotNonce;

    component newBallotHasher = HashLeftRight();
    newBallotHasher.left <== newBallotNonceMux.out;
    newBallotHasher.right <== newBallotVoRoot;

    component newBallotQip = QuinTreeInclusionProof(stateTreeDepth);
    newBallotQip.leaf <== newBallotHasher.hash;
    for (var i = 0; i < stateTreeDepth; i ++) {
        newBallotQip.path_index[i] <== stateLeafPathIndices.out[i];
        for (var j = 0; j < TREE_ARITY - 1; j++) {
            newBallotQip.path_elements[i][j] <== ballotPathElements[i][j];
        }
    }
    newBallotRoot <== newBallotQip.root;
}

template ProcessMessagesInputHasher() {
    // Combine the following into 1 input element:
    // - maxVoteOptions (50 bits)
    // - numSignUps (50 bits)
    // - batchStartIndex (50 bits)
    // - batchEndIndex (50 bits)

    // Hash coordPubKey:
    // - coordPubKeyHash 

    // Other inputs that can't be compressed or packed:
    // - msgRoot, currentSbCommitment, newSbCommitment

    // Also ensure that packedVals is valid

    signal input packedVals;
    signal input coordPubKey[2];
    signal input msgRoot;
    signal input currentSbCommitment;
    signal input newSbCommitment;
    signal input pollEndTimestamp;

    signal output maxVoteOptions;
    signal output numSignUps;
    signal output batchStartIndex;
    signal output batchEndIndex;
    signal output hash;
    
    // 1. Unpack packedVals and ensure that it is valid
    component unpack = UnpackElement(4);
    unpack.in <== packedVals;

    maxVoteOptions <== unpack.out[3];
    numSignUps <== unpack.out[2];
    batchStartIndex <== unpack.out[1];
    batchEndIndex <== unpack.out[0];

    // 2. Hash coordPubKey
    component pubKeyHasher = HashLeftRight();
    pubKeyHasher.left <== coordPubKey[0];
    pubKeyHasher.right <== coordPubKey[1];

    // 3. Hash the 6 inputs with SHA256
    component hasher = Sha256Hasher6();
    hasher.in[0] <== packedVals;
    hasher.in[1] <== pubKeyHasher.hash;
    hasher.in[2] <== msgRoot;
    hasher.in[3] <== currentSbCommitment;
    hasher.in[4] <== newSbCommitment;
    hasher.in[5] <== pollEndTimestamp;   

    hash <== hasher.hash;
}
