import assert from "node:assert"
import { 
    Ballot, 
    Command, 
    DeactivatedKeyLeaf, 
    KCommand, 
    Keypair,
    Message, 
    PCommand, 
    PrivateKey, 
    PublicKey, 
    StateLeaf, 
    TCommand,
    blankStateLeaf, 
    blankStateLeafHash
} from "../../domainobjs/src"
import { 
    BatchSizes, 
    DeactivatedKeyEvent, 
    MaxValues, 
    TreeDepths 
} from "../types"
import { 
    AccQueue, 
    IncrementalQuinTree, 
    NOTHING_UP_MY_SLEEVE, 
    SNARK_FIELD_SIZE, 
    elGamalEncryptBit, 
    elGamalRerandomize, 
    genRandomSalt, 
    hash2, 
    hash3, 
    hash4, 
    hash5, 
    sha256Hash, 
    stringifyBigInts, 
    verifySignature
} from "../../crypto/src"
import { 
    DEACT_KEYS_TREE_DEPTH, 
    DEACT_MESSAGE_INIT_HASH, 
    STATE_TREE_DEPTH 
} from "."
import { 
    Ciphertext,
    Signature
} from "../../crypto/types/types"
import { 
    smt
} from "circomlib"
import { 
    MaciState
} from "./Maci"

/**
 * @title Poll
 * @notice a Class representing a MACI Poll
 * @author PSE 
 */
export class Poll {
    // @notice the duration of the poll
    public duration: number 
    // @notice store the keypair of the coordinator (we only use the public key on chain)
    public coordinatorKeyPair: Keypair
    // @notice the depths of the trees
    public treeDepths: TreeDepths
    // @notice the batches sizes for more efficient processing
    public batchSizes: BatchSizes
    // @notice the max values to conform with the 
    public maxValues: MaxValues

    // @todo 
    public msgQueueSizeForProcessDeactivationMessagesCircuit = 5 

    public numSignUps: number 
    public pollEndTimestamp: number 
    public ballots: Ballot[] = []
    public ballotTree: IncrementalQuinTree

    public messages: Message[] = []
    public messageAq: AccQueue
    public messageTree: IncrementalQuinTree
    public commands: Command[] = []

    public encPubKeys: PublicKey[] = []
    public STATE_TREE_ARITY = 5
    public MESSAGE_TREE_ARITY = 5
    public VOTE_OPTION_TREE_ARITY = 5
    public DEACT_KEYS_TREE_ARITY = 5

    public stateCopied = false
    public stateLeaves: StateLeaf[] = [blankStateLeaf]
    public stateTree = new IncrementalQuinTree(
        STATE_TREE_DEPTH,
        blankStateLeafHash,
        this.STATE_TREE_ARITY,
        hash5,
    )

    // For key deactivation
    public deactivatedKeysChainHash = DEACT_MESSAGE_INIT_HASH
    public deactivatedKeysTree = new IncrementalQuinTree(
        DEACT_KEYS_TREE_DEPTH,
        DEACT_MESSAGE_INIT_HASH,
        this.DEACT_KEYS_TREE_ARITY,
        hash5,
    )
    public deactivationMessages: Message[] = []
    public deactivationEncPubKeys: PublicKey[] = []
    public deactivationCommands: PCommand[] = []
    public deactivationSignatures: Signature[] = []
    public numKeyGens: number = 0
    public nullifiersTree: smt.SMT;

    // For message processing
    public numBatchesProcessed = 0
    public currentMessageBatchIndex: number 
    public maciStateRef: MaciState
    public pollId: number

    public sbSalts: { [key: number]: bigint } = {}
    public resultRootSalts: { [key: number]: bigint } = {}
    public preVOSpentVoiceCreditsRootSalts: { [key: number]: bigint } = {}
    public spentVoiceCreditSubtotalSalts: { [key: number]: bigint } = {}

    // For vote tallying
    public results: bigint[] = []
    public perVOSpentVoiceCredits: bigint[] = []
    public numBatchesTallied = 0

    public totalSpentVoiceCredits: bigint = BigInt(0)

    // For coefficient and subsidy calculation
    public subsidy: bigint[] = []  // size: M, M is number of vote options
    public subsidySalts: { [key: number]: bigint } = {}
    public rbi = 0 // row batch index
    public cbi = 0 // column batch index
    public MM = 50    // adjustable parameter
    public WW = 4     // number of digits for float representation

    // used to store info about deactivatedKey events happening on chain 
    // so we can use it to search for deactivatedKeyIndex
    public deactivatedKeyEvents: DeactivatedKeyEvent[] = [];

    constructor (
        _duration: number,
        _pollEndTimestamp: bigint,
        _coordinatorKeypair: Keypair,
        _treeDepths: TreeDepths,
        _batchSizes: BatchSizes,
        _maxValues: MaxValues,
        _maciStateRef: MaciState,
    ) {
        this.duration = _duration
        this.pollEndTimestamp = this.pollEndTimestamp
        this.coordinatorKeyPair = _coordinatorKeypair
        this.treeDepths = _treeDepths
        this.batchSizes = _batchSizes
        this.maxValues = _maxValues
        this.maciStateRef = _maciStateRef

        // this.numSignups = this.maciStateRef.numSignups 
        this.messageTree = new IncrementalQuinTree(
            this.treeDepths.messageTreeDepth,
            NOTHING_UP_MY_SLEEVE,
            this.MESSAGE_TREE_ARITY,
            hash5
        )

        // the message accumulator queue 
        this.messageAq = new AccQueue(
            this.treeDepths.messageTreeSubDepth,
            this.MESSAGE_TREE_ARITY,
            NOTHING_UP_MY_SLEEVE
        )

        // fill these arrays with BigInt(0)
        this.results.fill(BigInt(0), 0, this.maxValues.maxVoteOptions)
        this.perVOSpentVoiceCredits.fill(BigInt(0), 0, this.maxValues.maxVoteOptions)
        this.subsidy.fill(BigInt(0), 0, this.maxValues.maxVoteOptions)

        // generate a blank ballot and add it to the ballots array 
        const blankBallot = Ballot.genBlankBallot(
            this.maxValues.maxVoteOptions,
            this.treeDepths.voteOptionTreeDepth
        )
        this.ballots.push(blankBallot)
    }

    public initNullifiersTree = async () => {
        this.nullifiersTree = await smt.newMemEmptyTrie()
        await this.nullifiersTree.insert(0, 0)
    }

    /**
     * @notice Allows to generate a new Key (msg type == 3)
     */
    public generateNewKey = (
        _message: Message,
        _encPubKey: PublicKey,
        _newStateIndex: bigint 
    ) => {
        // validation 
        assert(_message.msgType === BigInt(3), "Poll:generateNewKey: message type must be 3")
        assert(
            _encPubKey.rawPubKey[0] < SNARK_FIELD_SIZE && 
            _encPubKey.rawPubKey[1] < SNARK_FIELD_SIZE,
            "Poll:generateNewKey: public key must be less than SNARK_FIELD_SIZE"
        )

        for (const d of _message.data) 
            assert(d < SNARK_FIELD_SIZE, "Poll:generateNewKey: data must be less than SNARK_FIELD_SIZE")

        // save key and message
        this.encPubKeys.push(_encPubKey)
        this.messages.push(_message)

        const messageLeaf = _message.hash(_encPubKey)
        this.messageAq.enqueue(messageLeaf)
        this.messageTree.insert(messageLeaf)

        // decrypt the message and store the command 
        const sharedKey = Keypair.genEcdhSharedKey(
            this.coordinatorKeyPair.privKey,
            _encPubKey
        )

        try {
            const { command } = KCommand.decrypt(
                _message,
                sharedKey
            )
            command.setNewStateIndex(_newStateIndex)
            this.numKeyGens++
            this.commands.push(command)
        } catch (error: any) {
            // if there is an error decrypting, we add a empty command
            const keyPair = new Keypair()
            let command = new KCommand(keyPair.pubKey, BigInt(0), BigInt(0), [BigInt(0), BigInt(0)], [BigInt(0), BigInt(0)], BigInt(0))
            this.commands.push(command)
        }
    }

    /**
     * @notice Save the key event event
     * @param {bigint} _keyHash - the hash of the key 
     * @param {bigint[]} _c1 
     * @param {bigint[]} _c2 
     */
    public processDeactivatedKeyEvent = (
        _keyHash: bigint, 
        _c1: bigint[],
        _c2: bigint[]
    ) => {
        const deactivatedKeyEvent: DeactivatedKeyEvent = {
            keyHash: _keyHash,
            c1: _c1,
            c2: _c2
        }

        this.deactivatedKeyEvents.push(deactivatedKeyEvent)
    }

    /**
     * @notice Deactivate a key (msg type == 1)
     * @param _message 
     * @param _encPubKey 
     */
    public deactivateKey = (
        _message: Message,
        _encPubKey: PublicKey
    ) => {
        // validation 
        assert(_message.msgType === BigInt(1), "Poll:deactivateKey: message type must be 1")
        assert(
            _encPubKey.rawPubKey[0] < SNARK_FIELD_SIZE && 
            _encPubKey.rawPubKey[1] < SNARK_FIELD_SIZE,
            "Poll:deactivateKey: public key must be less than SNARK_FIELD_SIZE"
        )

        for (const d of _message.data) 
            assert(d < SNARK_FIELD_SIZE, "Poll:deactivateKey: data must be less than SNARK_FIELD_SIZE")

        this.deactivationMessages.push(_message)

        const messageHash = _message.hash(_encPubKey)

        // update the chain hash 
        this.deactivatedKeysChainHash = hash2([this.deactivatedKeysChainHash, messageHash])
        
        // store the enc pub key
        this.deactivationEncPubKeys.push(_encPubKey)

        // decrypt the message and store the Command 
        const sharedKey = Keypair.genEcdhSharedKey(
            this.coordinatorKeyPair.privKey,
            _encPubKey
        )

        try {
            const { command, signature } = PCommand.decrypt(
                _message,
                sharedKey
            )

            this.deactivationSignatures.push(signature)
            this.deactivationCommands.push(command)
        } catch (error: any) {
            const keyPair = new Keypair()
            const command = new PCommand(BigInt(1), keyPair.pubKey, BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0))
            this.deactivationCommands.push(command)
            this.deactivationSignatures.push({} as Signature)
        }
    }

    /**
     * @notice a private function that copies the state 
     * from the Maci instance reference
     */
    private copyStateFromMaci = () => {
        // validation 
        assert(this.maciStateRef.stateLeaves.length === this.maciStateRef.stateTree.nextIndex)

        // copy the state leaves and the state tree
        this.stateLeaves = this.maciStateRef.stateLeaves.map(
            (x) => x.copy()
        )
        this.stateTree = this.maciStateRef.stateTree.copy()

        // Create as many ballots as state leaves
        const emptyBallot = new Ballot(
            this.maxValues.maxVoteOptions,
            this.treeDepths.voteOptionTreeDepth,
        )
        const emptyBallotHash = emptyBallot.hash()
        this.ballotTree = new IncrementalQuinTree(
            STATE_TREE_DEPTH,
            emptyBallot.hash(),
            this.STATE_TREE_ARITY,
            hash5,
        )
        this.ballotTree.insert(emptyBallotHash)

        while (this.ballots.length < this.stateLeaves.length) {
            this.ballotTree.insert(emptyBallotHash)
            this.ballots.push(emptyBallot)
        }

        this.numSignUps = Number(this.maciStateRef.numSignUps.toString()) // TODO: Collect num generated

        this.stateCopied = true
    }

    /**
     * Processes a topup message
     * @param {Message} _message 
     */
    public topupMessage = (
        _message: Message,
        _pollId: bigint
    ) => {
        // validation 
        assert (_message.msgType === BigInt(2), "Poll:topupMessage: message type must be 2")
        for (const d of _message.data) 
            assert(d < SNARK_FIELD_SIZE, "Poll:topupMessage: data must be less than SNARK_FIELD_SIZE")

        // store the message
        this.messages.push(_message)

        const padKey = new PublicKey([
            BigInt('10457101036533406547632367118273992217979173478358440826365724437999023779287'),
            BigInt('19824078218392094440610104313265183977899662750282163392862422243483260492317'),
        ])

        this.encPubKeys.push(padKey)
        const messageLeaf = _message.hash(padKey)
        this.messageAq.enqueue(messageLeaf)
        this.messageTree.insert(messageLeaf)

        // @todo check if it's ok to pass the id as param 
        const command = new TCommand(
            _message.data[0], 
            _message.data[1],
            _pollId
        )

        this.commands.push(command)
    }

    /**
     * @notice Insert a Message and the pub key used to generate the 
     * shared key which encrypted the message
     */
    public publishMessage = (
        _message: Message,
        _encPubKey: PublicKey
    ) => {
        // validation 
        assert(_message.msgType === BigInt(1))
        assert (
            _encPubKey.rawPubKey[0] < SNARK_FIELD_SIZE && 
            _encPubKey.rawPubKey[1] < SNARK_FIELD_SIZE,
            "Poll:publishMessage: public key must be less than SNARK_FIELD_SIZE"
        )
        for (const d of _message.data) 
            assert(d < SNARK_FIELD_SIZE, "Poll:publishMessage: data must be less than SNARK_FIELD_SIZE")

        // store the key and the message
        this.encPubKeys.push(_encPubKey)
        this.messages.push(_message)

        // hash the message
        const messageLeaf = _message.hash(_encPubKey)
        this.messageAq.enqueue(messageLeaf)
        this.messageTree.insert(messageLeaf)

        // now decrypt the message and store the command
        const sharedKey = Keypair.genEcdhSharedKey(
            this.coordinatorKeyPair.privKey,
            _encPubKey
        )

        try {
            const { command } = PCommand.decrypt(
                _message,
                sharedKey
            )
            this.commands.push(command)
        } catch (error: any) {
            const keyPair = new Keypair()
            // @note check that the message type is correct
            const command = new PCommand(BigInt(1), keyPair.pubKey, BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0))
            this.commands.push(command)
        }
    }

    /**
     * Merge all enqueued message into a tree
     */
    public mergeAllMessages = () => {
        this.messageAq.mergeSubRoots(0)
        this.messageAq.merge(this.treeDepths.messageTreeDepth)
        // ensure that the message aq was merged
        assert(this.isMessageAqMerged(), "Poll:mergeAllMessages: message aq must be merged")
    }

    /**
     * Check whether there are any unprocessed messages
     */
    public hasUnprocessedMessages = (): boolean => {
        const batchSize = this.batchSizes.messageBatchSize

        // calculate how many batches there are based on the
        // num of messages stored
        let totalBatches =
            this.messages.length <= batchSize ?
                1 :
                Math.floor(this.messages.length / batchSize)

        // if there are any messages left over, add another batch
        if (this.messages.length % batchSize !== 0) 
            totalBatches++
        
        return this.numBatchesProcessed < totalBatches
    }

    /**
     * Process the key deactivation messages
     * @param {bigint} _seed 
     */
    public processDeactivationMessages = (_seed: bigint) => {
        const maskingValues: bigint[] = []
        const elGamalEnc: Ciphertext[][] = []
        const deactivatedLeaves: DeactivatedKeyLeaf[] = []

        // if we haven't copied the state yet from the maci instance
        // then copy it
        if (!this.stateCopied) this.copyStateFromMaci()

        let mask = _seed 
        let computedStateIndex = 0

        const stateLeafPathElements: bigint[] = []
        const currentStateLeaves: bigint[][] = []

        // loop through all key deactivation messages
        for (let i = 0; i < this.deactivationMessages.length; i++) {
            const deactivationCommand = this.deactivationCommands[i]
            const signature = this.deactivationSignatures[i]

            // unwrap the command 
            const {
                stateIndex,
                newPubKey,
                voteOptionIndex,
                newVoteWeight,
                salt 
            } = deactivationCommand

            const stateIndexInt = parseInt(stateIndex.toString()) 
            computedStateIndex = 
                stateIndexInt > 0 && stateIndexInt < this.numSignUps 
                ?
                    stateIndexInt - 1
                :
                    -1

            let pubKey: PublicKey
            if (computedStateIndex !== -1) {
                pubKey = this.stateLeaves[stateIndexInt].pubKey
                stateLeafPathElements.push(this.stateTree.genMerklePath(stateIndexInt).pathElements)
                currentStateLeaves.push(this.stateLeaves[stateIndexInt].asCircuitInputs())
            } else {
                // if the state index was 0 or greater than the number of signups
                pubKey = new PublicKey([BigInt(0), BigInt(0)])
                stateLeafPathElements.push(this.stateTree.genMerklePath(0).pathElements)
                // push the blank state leaf
                currentStateLeaves.push(this.stateLeaves[0].asCircuitInputs())
            }

            // verify that the deactivation message was correct
            const status = 
                // cmd type must be 1
                deactivationCommand.cmdType === BigInt(1) &&
                // there must be a signature
                signature !== null &&
                // the signature must be valid 
                verifySignature(
                    deactivationCommand.hash(),
                    signature,
                    pubKey.rawPubKey
                )
                // @todo check the following lines
                // && newPubKey.rawPubKey[0].toString() == '0'
                // && newPubKey.rawPubKey[1].toString() == '0'
                // && voteOptionIndex.toString() == '0'
                // && newVoteWeight.toString() == '0'

            mask = hash2([mask, salt])
            maskingValues.push(mask)

            // encrypt the coordinator pub key, status and mask 
            const [c1, c2] = elGamalEncryptBit(
                this.coordinatorKeyPair.pubKey.rawPubKey,
                status ? BigInt(1) : BigInt(0),
                mask 
            )

            elGamalEnc.push([c1, c2])

            // create the leaf
            const deactivatedLeaf = new DeactivatedKeyLeaf(
                pubKey,
                c1, 
                c2,
                salt 
            )
            // store it and its hash 
            this.deactivatedKeysTree.insert(deactivatedLeaf.hash())
            deactivatedLeaves.push(deactivatedLeaf)
        }

        // pad the deactivation key array with empty keys
        for (let i = this.deactivationEncPubKeys.length; i < this.msgQueueSizeForProcessDeactivationMessagesCircuit; i++) 
            this.deactivationEncPubKeys.push(new PublicKey([BigInt(0), BigInt(0)]))
        
        const deactivatedTreePathElements: any[] = [];
        for (let i = 0; i < this.deactivationMessages.length; i += 1) {
            const merklePath = this.deactivatedKeysTree.genMerklePath(i);
            deactivatedTreePathElements.push(merklePath.pathElements);
        }

        // Pad deactivatedTreePathElements array
        for (let i = this.deactivationMessages.length; i < this.msgQueueSizeForProcessDeactivationMessagesCircuit; i += 1) {
            deactivatedTreePathElements.push(this.stateTree.genMerklePath(0).pathElements)
        }
    
        // Pad stateLeafPathElements array
        for (let i = stateLeafPathElements.length; i < this.msgQueueSizeForProcessDeactivationMessagesCircuit; i += 1) {
            stateLeafPathElements.push(this.stateTree.genMerklePath(0).pathElements)
        }
    
        // Pad currentStateLeaves array
        for (let i = currentStateLeaves.length; i < this.msgQueueSizeForProcessDeactivationMessagesCircuit; i += 1) {
            currentStateLeaves.push(blankStateLeaf.asCircuitInputs())
        }

        // Pad deactivationMessages array
        for (let i = this.deactivationMessages.length; i < this.msgQueueSizeForProcessDeactivationMessagesCircuit; i += 1) {
            const padMask = genRandomSalt();
            const [padc1, padc2] = elGamalEncryptBit(
                this.coordinatorKeyPair.pubKey.rawPubKey,
                BigInt(0),
                padMask,
            )

            maskingValues.push(padMask);
            elGamalEnc.push([padc1, padc2]);
            this.deactivationMessages.push(new Message(BigInt(0), Array(10).fill(BigInt(0))))
        }

        const circuitInputs = stringifyBigInts({
            coordPrivKey: this.coordinatorKeyPair.privKey.asCircuitInputs(),
            coordPubKey: this.coordinatorKeyPair.pubKey.rawPubKey,
            encPubKeys: this.deactivationEncPubKeys.map(k => k.asCircuitInputs()),
            msgs: this.deactivationMessages.map(m => m.asCircuitInputs()),
            deactivatedTreePathElements,
            stateLeafPathElements: stateLeafPathElements,
            currentStateLeaves: currentStateLeaves,
            elGamalEnc,
            maskingValues,
            deactivatedTreeRoot: this.deactivatedKeysTree.root,
            currentStateRoot: this.stateTree.root,
            numSignUps: this.numSignUps,
            chainHash: this.deactivatedKeysChainHash,
            inputHash: sha256Hash([
                this.deactivatedKeysTree.root,
                this.numSignUps,
                this.stateTree.root,
                this.deactivatedKeysChainHash,
            ]),
        })

        return { circuitInputs, deactivatedLeaves }
    }   

    /**
     * Generate the circuit inputs for generating a new key 
     * @param newPublicKey 
     * @param deactivatedPrivateKey 
     * @param deactivatedPublicKey 
     * @param coordinatorPublicKey 
     * @param stateIndex 
     * @param newCreditBalance 
     * @param salt 
     * @param pollId 
     */
    public generateCircuitInputsForGenerateNewKey = (
        newPublicKey: PublicKey,
        deactivatedPrivateKey: PrivateKey,
        deactivatedPublicKey: PublicKey,
        coordinatorPublicKey: PublicKey,
        stateIndex: bigint,
        newCreditBalance: bigint,
        salt: bigint,
        pollId: bigint
    ) => {
        if (!this.stateCopied) this.copyStateFromMaci()

        const deactivatedKeyHash = hash3([...deactivatedPublicKey.asArray(), salt])
        const deactivatedKeyIndex = this.deactivatedKeyEvents.findIndex(d => d.keyHash.toString() == deactivatedKeyHash.toString())

        if (deactivatedKeyIndex == -1) {
            throw new Error('Poll:generateCircuitInputsForGenerateNewKey: deactivated key not found')
        }

        const deactivatedKeyEvent = this.deactivatedKeyEvents[deactivatedKeyIndex]

        const z = genRandomSalt()
        // const z = BigInt(42)

        const [c1r, c2r] = elGamalRerandomize(
            coordinatorPublicKey.rawPubKey,
            z,
            deactivatedKeyEvent.c1,
            deactivatedKeyEvent.c2
        )

        if (this.deactivatedKeysTree.nextIndex === 0) 
            this.deactivatedKeyEvents.forEach(dke => {
                const deactivatedLeafHash = hash5([dke.keyHash, ...dke.c1, ...dke.c2])
                this.deactivatedKeysTree.insert(deactivatedLeafHash)
            })
        
        const nullifier = hash2([BigInt(deactivatedPrivateKey.asCircuitInputs()), salt])

        const kCommand: KCommand = new KCommand(
            newPublicKey,
            newCreditBalance,
            nullifier,
            c1r, 
            c2r,
            pollId
        )

        return kCommand.prepareValues(
            deactivatedPrivateKey,
            this.stateLeaves,
            this.stateTree,
            BigInt(this.numSignUps),
            stateIndex,
            salt,
            coordinatorPublicKey,
            this.deactivatedKeysTree,
            BigInt(deactivatedKeyIndex),
            z,
            deactivatedKeyEvent.c1,
            deactivatedKeyEvent.c2
        )

    }

    /**
     * Process _batchSize messages starting from the saved index.  This
     * function will process messages even if the number of messages is not an
     * exact multiple of _batchSize. e.g. if there are 10 messages, _index is
     * 8, and _batchSize is 4, this function will only process the last two
     * messages in this.messages, and finally update the zeroth state leaf.
     * Note that this function will only process as many state leaves as there
     * are ballots to prevent accidental inclusion of a new user after this
     * poll has concluded.
     * @param _pollId The ID of the poll associated with the messages to
     *        process
     * @return The inputs for the processMessages circuit
     */
    public processMessages = async (
        _pollId: number 
    ): Promise<any> => {
        // validation first
        assert(this.hasUnprocessedMessages(), 'Poll:processMessages, No more messages to process')
        assert(this.isMessageAqMerged(), 'Poll:processMessages, Message accumulator queue must be merged')
        assert(this.messageAq.hasRoot(this.treeDepths.messageTreeDepth), 'Poll:processMessages, Message accumulator queue must have a root')

        // cache batch size
        const batchSize = this.batchSizes.messageBatchSize

        // The starting index of the batch of messages to process.
        // Note that we process messages in reverse order.
        // e.g if there are 8 messages and the batch size is 5, then
        // the starting index should be 5.
        if (this.numBatchesProcessed === 0) 
            assert(this.currentMessageBatchIndex === undefined)
            // prevent other batches from being processed
            this.maciStateRef.pollBeingProcess = true
            this.maciStateRef.currentPollBeingProcessed = _pollId 

        // @todo look if we can move this up 
        if (this.maciStateRef.pollBeingProcessed) assert(this.maciStateRef.currentPollBeingProcessed === _pollId)

        if (this.numBatchesProcessed === 0) {
            const r = this.messages.length % batchSize 

            if (r === 0) {
                this.currentMessageBatchIndex = 
                    Math.floor(this.messages.length / batchSize) * batchSize
            } else this.currentMessageBatchIndex = this.messages.length 

            if (this.currentMessageBatchIndex > 0) {
                if (r === 0) this.currentMessageBatchIndex -= batchSize
                else this.currentMessageBatchIndex -= r
            }
        }

        // we want to ensure that the starting index is valid 
        assert(this.currentMessageBatchIndex >= 0 && this.currentMessageBatchIndex % batchSize === 0, 'Poll:processMessages, Invalid current message batch index')

        // ensure we copied MACI's state
        if (!this.stateCopied) this.copyStateFromMaci()

        const circuitInputs = stringifyBigInts(
            await this.genProcessMessagesCircuitInputsPartial(this.currentMessageBatchIndex)
        )

        const currentStateLeaves: StateLeaf[] = []
        const currentStateLeavesPathElements: any[] = []

        const currentBallots: Ballot[] = []
        const currentBallotsPathElements: any[] = []

        const currentVoteWeights: BigInt[] = []
        const currentVoteWeightsPathElements: any[] = []

        const currentNullifierRoot = this.nullifiersTree.root
        const currentNullifierLeavesPathElements: BigInt[] = []
        const nullifierInclusionFlags: BigInt[] = []

        for (let i = 0; i < batchSize; i++) {
            // get the zero proof 
            const zeroProof = await this.nullifiersTree.find(BigInt(0))
            const zeroNullifierElements = zeroProof.siblings 
            // pad the array with zeros
            for (let i = zeroNullifierElements.length; i < STATE_TREE_DEPTH; i++)
                zeroNullifierElements.push(BigInt(0))

            const index = this.currentMessageBatchIndex + batchSize - i - 1
            assert(index >= 0, 'Poll:processMessages - Invalid index')

            // when index is larger than the actual size
            // create an empty message pass to the switch statement  
            const message: Message = index >= this.messages.length ?
                new Message(BigInt(1), Array(10).fill(BigInt(0))) :
                this.messages[index]

            // based on the message type we are going to process it differently
            switch (message.msgType) {
                case BigInt(1):
                    // add to the first index 
                    currentNullifierLeavesPathElements.unshift(zeroNullifierElements)
                    nullifierInclusionFlags.unshift(BigInt(0))
                    try {
                        // process it 
                        const r = this.processMessage(index)
                        
                        currentStateLeaves.unshift(r.originalStateLeaf)
                        currentBallots.unshift(r.originalBallot)
                        currentVoteWeights.unshift(r.originalVoteWeight)
                        currentVoteWeightsPathElements.unshift(r.originalVoteWeightPathElements)
                        currentStateLeavesPathElements.unshift(r.originalStateLeafPathElements)
                        currentBallotsPathElements.unshift(r.originalBallotPathElements)

                        this.stateLeaves[r.stateLeafIndex] = r.newStateLeaf.copy()
                        this.stateTree.update(r.stateLeafIndex, r.newStateLeaf.hash())
                        this.ballots[r.stateLeafIndex] = r.newBallot.copy()
                        this.ballotTree.update(r.stateLeafIndex, r.newBallot.hash())
                    
                    } catch (error: any) {
                        if (error.message === 'no-op') {
                            // We have an invalid message, so we just use a blank state leaf
                            // @todo check if it's more efficient to use the blankStateLeaf constant
                            currentStateLeaves.unshift(this.stateLeaves[0].copy())
                            currentStateLeavesPathElements.unshift(this.stateTree.genMerklePath(0).pathElements)

                            currentBallots.unshift(this.ballots[0].copy())
                            currentBallotsPathElements.unshift(this.ballotTree.genMerklePath(0).pathElements)

                            // we use vote option 0 for invalid votes 
                            // @todo check this 
                            currentVoteWeights.unshift(this.ballots[0].votes[0])

                            // No need to iterate through the entire votes array if the
                            // remaining elements are 0
                            let lastIndexToInsert = this.ballots[0].votes.length - 1
                            while (lastIndexToInsert > 0) {
                                if (this.ballots[0].votes[lastIndexToInsert] === BigInt(0)) {
                                    lastIndexToInsert--
                                } else {
                                    break
                                }
                            }

                            const vt = new IncrementalQuinTree(
                                this.treeDepths.voteOptionTreeDepth,
                                BigInt(0),
                                5,
                                hash5
                            )

                            for (let i = 0; i <= lastIndexToInsert; i++) vt.insert(this.ballots[0].votes[i])
                            currentVoteWeightsPathElements.unshift(vt.genMerklePath(0).pathElements)
                        } else throw error 
                    }
                    break 
                case BigInt(2):
                    currentNullifierLeavesPathElements.unshift(zeroNullifierElements)
                    nullifierInclusionFlags.unshift(BigInt(0))

                    try {
                        // generate top up circuit inputs
                        const stateIndex = message.data[0] >= BigInt(this.ballots.length) ? BigInt(0) : message.data[0]
                        const amount = message.data[0] >= BigInt(this.ballots.length) ? BigInt(0) : message.data[1]

                        currentStateLeaves.unshift(this.stateLeaves[Number(stateIndex)].copy())
                        currentStateLeavesPathElements.unshift(this.stateTree.genMerklePath(Number(stateIndex)).pathElements)

                        // @todo is there any limit to the voice credit balance?
                        const newStateLeaf = this.stateLeaves[Number(stateIndex)].copy()
                        newStateLeaf.voiceCreditBalance = newStateLeaf.voiceCreditBalance.valueOf() + amount 
                        this.stateLeaves[Number(stateIndex)] = newStateLeaf
                        this.stateTree.update(Number(stateIndex), newStateLeaf.hash())

                        const currentBallot = this.ballots[Number(stateIndex)].copy()
                        currentBallots.unshift(currentBallot)
                        currentBallotsPathElements.unshift(this.ballotTree.genMerklePath(Number(stateIndex)).pathElements)
                        currentVoteWeights.unshift(currentBallot.votes[0])

                        const vt = new IncrementalQuinTree(
                            this.treeDepths.voteOptionTreeDepth,
                            BigInt(0),
                            5,
                            hash5
                        )

                        for (let i = 0; i < this.ballots[0].votes.length; i++) vt.insert(currentBallot.votes[i])
                        currentVoteWeightsPathElements.unshift(vt.genMerklePath(0).pathElements)
                    } catch (error: any) {
                        throw error 
                    }
                    break 
                case BigInt(3):
                    try {

                    } catch (error: any) {
                        if (error.message === 'no-op') {
                            // use a blank state leaf for invalid commands
                        } else {
                            throw error 
                        }

                    }
                default: break 
            }
        }

        circuitInputs.currentStateLeaves = currentStateLeaves.map(l => l.asCircuitInputs()) 
        circuitInputs.currentStateLeavesPathElements = currentStateLeavesPathElements
        circuitInputs.currentBallots = currentBallots.map(b => b.asCircuitInputs())
        circuitInputs.currentBallotsPathElements = currentBallotsPathElements
        circuitInputs.currentVoteWeights = currentVoteWeights
        circuitInputs.currentVoteWeightsPathElements = currentVoteWeightsPathElements
        circuitInputs.currentNullifierLeavesPathElements = currentNullifierLeavesPathElements
        circuitInputs.nullifierInclusionFlags = nullifierInclusionFlags
        circuitInputs.numKeysGens = this.numKeyGens 
        circuitInputs.currentNullifierRoot = currentNullifierRoot

        this.numBatchesProcessed++

        if (this.currentMessageBatchIndex > 0) this.currentMessageBatchIndex -= batchSize 

        // @todo currentSbSalt should not equal newSbSalt 
        const newSbSalt = genRandomSalt()
        this.sbSalts[this.currentMessageBatchIndex] = newSbSalt

        circuitInputs.newSbSalt = newSbSalt

        circuitInputs.newSbCommitment = hash4([
            this.stateTree.root,
            this.ballotTree.root,
            this.nullifiersTree.root,
            newSbSalt
        ])

        circuitInputs.inputHash = sha256Hash([
            circuitInputs.packedVals,
            this.coordinatorKeyPair.pubKey.hash(),
            circuitInputs.msgRoot,
            circuitInputs.currentSbCommitment,
            circuitInputs.newSbCommitment,
            this.pollEndTimestamp
        ])

        // if we have processed all batches, then we can release the lock on the maci state obj 
        if (this.numBatchesProcessed * batchSize >= this.messages.length) this.maciStateRef.pollBeingProcess = false

        return stringifyBigInts(circuitInputs)
    }

    /**
     * Generates inputs for the processMessages circuit
     * @param _index 
     * @return The inputs for the processMessages circuit
     */
    public genProcessMessagesCircuitInputsPartial = async (
        _index: number 
    ) => {
        // validation
        assert(
            _index <= this.messages.length && 
            _index % this.batchSizes.messageBatchSize === 0
            , 'Poll:genProcessMessagesCircuitInputsPartial: Invalid index'
        )

        let msgs = this.messages.map((x, index) => x.asCircuitInputs().concat(
            [
                this.commands[index] instanceof KCommand ?
                    (this.commands[index] as KCommand).newStateIndex :
                    BigInt(0)
            ]
        ))

        const zeroProof = await this.nullifiersTree.find(BigInt(0))
        for (let i = zeroProof.siblings.length; i < STATE_TREE_DEPTH; i++) 
            zeroProof.siblings.push(BigInt(0))

        while (msgs.length % this.batchSizes.messageBatchSize > 0)
            msgs.push([...new Message(BigInt(1), Array(10).fill(BigInt(0))).asCircuitInputs(), BigInt(0)])

        msgs = msgs.slice(_index, _index + this.batchSizes.messageBatchSize)

        let commands = this.commands.map((x) => x.copy())
        // @todo how does this make sense?
        while (commands.length % this.batchSizes.messageBatchSize > 0) 
            commands.push(commands[commands.length - 1])
        commands = commands.slice(_index, _index + this.batchSizes.messageBatchSize)
        // @todo finish 
    }


    /**
     * Checks whether the message acc queue was merged
     * @returns Whether the message acc queue was merged or not
     */
    private isMessageAqMerged = (): boolean => {
        return this.messageAq.getRoot(
            this.treeDepths.messageTreeDepth
        ) === this.messageTree.root
    }

    /**
     * Checks whether there are any untallied ballots
     * @returns Whether there are any untallied ballots
     */
    public hasUntalliedBallots = (): boolean => {
        return this.numBatchesTallied * this.batchSizes.tallyBatchSize < this.ballots.length
    }

    /**
     * Check if there are any unprocessed subsidy calculations
     * @return Whether there are any unprocessed subsidy calculations
     */
    public hasUnfinishedSubsidyCalculation = () => {
        return (
            this.rbi * this.batchSizes.subsidyBatchSize < this.ballots.length
        ) && (
            this.cbi * this.batchSizes.subsidyBatchSize < this.ballots.length
        )
        
    }

    public equals = (p: Poll): boolean => {
        return true 
    }

    public copy = (): Poll => {
        return this 
    }
}