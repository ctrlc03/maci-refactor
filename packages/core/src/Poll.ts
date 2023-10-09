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
    hashLeftRight, 
    sha256Hash, 
    stringifyBigInts, 
    verifySignature
} from "../../crypto/src"
import { 
    DEACT_KEYS_TREE_DEPTH, 
    DEACT_MESSAGE_INIT_HASH, 
    STATE_TREE_DEPTH, 
    packProcessMessageSmallVals
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

    /**
     * Generate a new Poll instance
     * @param _pollEndTimestamp - When the Poll ends.
     * @param _coordinatorKeypair - The key pair of the coordinator
     * @param _treeDepths - The depths of the merkle trees
     * @param _batchSizes - The sizes of the message batches
     * @param _maxValues - The max values for the circuit params
     * @param _maciStateRef - The MaciState reference
     * @param _pollId - The id of the poll
     */
    constructor (
        _pollEndTimestamp: number,
        _coordinatorKeypair: Keypair,
        _treeDepths: TreeDepths,
        _batchSizes: BatchSizes,
        _maxValues: MaxValues,
        _maciStateRef: MaciState,
        _pollId: number 
    ) {
        this.pollEndTimestamp = _pollEndTimestamp
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

        this.pollId = _pollId
    }

    /**
     * Create a new empty nullifier tree
     */
    public initNullifiersTree = async () => {
        this.nullifiersTree = await smt.newMemEmptyTrie()
        await this.nullifiersTree.insert(0, 0)
    }

    /**
     * @notice Allows to generate a new Key (msg type == 3)
     * @param _message 
     * @param _encPubKey
     * @param _newStateIndex
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
     * @param _keyHash - the hash of the key 
     * @param _c1 
     * @param _c2 
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
            BigInt(this.pollId)
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
            // @note check that the message type is correct (in the original version it was 0)
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
     * @returns true if there are unprocessed messages, false otherwise
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
     */
    public generateCircuitInputsForGenerateNewKey = (
        newPublicKey: PublicKey,
        deactivatedPrivateKey: PrivateKey,
        deactivatedPublicKey: PublicKey,
        coordinatorPublicKey: PublicKey,
        stateIndex: bigint,
        newCreditBalance: bigint,
        salt: bigint,
    ) => {
        if (!this.stateCopied) this.copyStateFromMaci()

        const deactivatedKeyHash = hash3([...deactivatedPublicKey.asArray(), salt])
        const deactivatedKeyIndex = this.deactivatedKeyEvents.findIndex(d => d.keyHash.toString() == deactivatedKeyHash.toString())

        if (deactivatedKeyIndex == -1) {
            throw new Error('Poll:generateCircuitInputsForGenerateNewKey: deactivated key not found')
        }

        const deactivatedKeyEvent = this.deactivatedKeyEvents[deactivatedKeyIndex]

        // @note in the original version it was fixed to 42 
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
            BigInt(this.pollId)
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
     * @return The inputs for the processMessages circuit
     */
    public processMessages = async (
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
            this.maciStateRef.pollBeingProcessed = true
            this.maciStateRef.currentPollBeingProcessed = this.pollId  

        // @todo look if we can move this up 
        if (this.maciStateRef.pollBeingProcessed) assert(this.maciStateRef.currentPollBeingProcessed === this.pollId)

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
        if (this.numBatchesProcessed * batchSize >= this.messages.length) this.maciStateRef.pollBeingProcessed = false

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

        // pad with zero value
        while (this.messageTree.nextIndex < _index + this.batchSizes.messageBatchSize) 
            this.messageTree.insert(this.messageTree.zeroValue)

        const messageSubRootPath = this.messageTree.genMerkleSubrootPath(
            _index,
            _index + this.batchSizes.messageBatchSize
        )

        assert(
            IncrementalQuinTree.verifyMerklePath(
                messageSubRootPath,
                this.messageTree.hashFunc
            ),
            'Poll:genProcessMessagesCircuitInputsPartial: Invalid message subroot path'
        )

        const batchEndIndex = _index + this.batchSizes.messageBatchSize > this.messages.length ? 
            this.messages.length : 
            _index + this.batchSizes.messageBatchSize

        let encPubKeys = this.encPubKeys.map((x) => x.copy())
        // @todo why are we pushing the last element?
        while (encPubKeys.length % this.batchSizes.messageBatchSize > 0) {
            encPubKeys.push(encPubKeys[encPubKeys.length - 1])
        }
        // @todo why in the original we use _index + batchEndIndex but not batchEndIndex??
        encPubKeys = encPubKeys.slice(_index, batchEndIndex)

        const msgRoot = this.messageAq.getRoot(this.treeDepths.messageTreeDepth)

        const currentSbCommitment = hash4([
            this.stateTree.root,
            this.ballotTree.root,
            this.nullifiersTree.root,
            this.sbSalts[this.currentMessageBatchIndex]
        ])

        // @todo in the original version it says:
        // Generate a SHA256 hash of inputs which the contract provides
        // but no hash is generated
        const packedVals = packProcessMessageSmallVals(
            BigInt(this.maxValues.maxVoteOptions),
            BigInt(this.numSignUps),
            _index,
            batchEndIndex
        )

        return stringifyBigInts({
            pollEndTimestamp: this.pollEndTimestamp,
            packedVals,
            msgRoot,
            msgs,
            msgSubrootPathElements: messageSubRootPath.pathElements,
            coordPrivKey: this.coordinatorKeyPair.privKey.asCircuitInputs(),
            coordPubKey: this.coordinatorKeyPair.pubKey.asCircuitInputs(),
            encPubKeys: encPubKeys.map((x) => x.asCircuitInputs()),
            currentStateRoot: this.stateTree.root,
            currentBallotRoot: this.ballotTree.root,
            currentSbCommitment,
            currentSbSalt: this.sbSalts[this.currentMessageBatchIndex]
        })
    }

    /**
     * Process all messages. This function does not update the ballots or state
     * leaves; rather, it copies and then updates them. This makes it possible
     * to test the result of multiple processMessage() invocations.
     * @return The state leaves and ballots after processing all messages
     */
    public processAllMessages = async () => {
        if (!this.stateCopied) this.copyStateFromMaci()

        const stateLeaves = this.stateLeaves.map((l) => l.copy())
        const ballots = this.ballots.map((b) => b.copy())
        while (this.hasUnprocessedMessages) {
            await this.processMessages()
        }

        return { stateLeaves, ballots }
    }

    /**
     * Process one message only
     * @param _index The index of the message to process
     */
    private processMessage = (_index: number) => {
        try {
            // validation
            assert(_index >= 0 && this.messages.length > _index, 'Poll:processMessage: Invalid index')
            
            // ensure that there is the correct number of shared keys
            assert(this.encPubKeys.length === this.messages.length, 'Poll:processMessage: Invalid number of shared keys')

            // extract the message and the enc pub key 
            const message = this.messages[_index]
            const encPubKey = this.encPubKeys[_index]

            // decrypt the message
            // 1. generate the shared key
            const sharedKey = Keypair.genEcdhSharedKey(
                this.coordinatorKeyPair.privKey,
                encPubKey
            )
            // 2. decrypt it
            const { command, signature } = PCommand.decrypt(message, sharedKey)

            // @todo - work out a better error system 
            if (command.stateIndex >= BigInt(this.ballots.length) || command.stateIndex < BigInt(1)) 
                throw new Error("no-op")

            // @todo look at how to handle this error 
            if (command.stateIndex >= BigInt(this.stateTree.nextIndex)) throw new Error("TODO")

            // this leaf is the signed up user
            const stateLeaf = this.stateLeaves[Number(command.stateIndex)]

            // the ballot that we are working on 
            const ballot = this.ballots[Number(command.stateIndex)]

            // if the signature is not valid then throw an error
            if (!command.verifySignature(signature, stateLeaf.pubKey)) throw new Error("TODO")

            // if the nonce is not valid, then throw
            if (command.nonce !== ballot.nonce + BigInt(1)) throw new Error("TODO")

            // validate voice credits
            const prevSpentCred = ballot.votes[Number(command.voteOptionIndex)]

            // @todo check the validity of this 
            const voiceCreditsLeft = BigInt(100)
            // const voiceCreditsLeft = stateLeaf.voiceCreditBalance - prevSpentCre
            /*
            const voiceCreditsLeft =
                BigInt(`${stateLeaf.voiceCreditBalance}`) +
                (BigInt(`${prevSpentCred}`) * BigInt(`${prevSpentCred}`)) -
                (BigInt(`${command.newVoteWeight}`) * BigInt(`${command.newVoteWeight}`))
            */

            if (voiceCreditsLeft < BigInt(0)) throw new Error("TODO")

            // we need to check that the vote option is valid
            if (command.voteOptionIndex < BigInt(0) || command.voteOptionIndex >= this.maxValues.maxVoteOptions) throw new Error("no-op")

            const newStateLeaf = stateLeaf.copy()
            newStateLeaf.voiceCreditBalance = voiceCreditsLeft 
            newStateLeaf.pubKey = command.newPubKey.copy()

            const newBallot = ballot.copy()
            newBallot.nonce = newBallot.nonce + BigInt(1)
            newBallot.votes[Number(command.voteOptionIndex)] = command.newVoteWeight

            const originalStateLeafPathElements = this.stateTree.genMerklePath(Number(command.stateIndex)).pathElements 
            const originalBallotPathElements = this.ballotTree.genMerklePath(Number(command.stateIndex)).pathElements

            const originalVoteWeight = ballot.votes[Number(command.voteOptionIndex)]
            // the vote option tree
            const vt = new IncrementalQuinTree(
                this.treeDepths.voteOptionTreeDepth,
                BigInt(0),
                5,
                hash5
            )

            // @todo why are we looping through ballots[0]? it could have less votes than this one 
            for (let i = 0; i < this.ballots[0].votes.length; i++) {
                vt.insert(ballot.votes[i])
            }

            const originalVoteWeightsPathElements = vt.genMerklePath(command.voteOptionIndex).pathElements

            return {
                stateLeafIndex: Number(command.stateIndex),
                newStateLeaf,
                originalStateLeaf: stateLeaf.copy(),
                originalVoteWeight,
                originalVoteWeightsPathElements,
                newBallot,
                originalBallot: ballot.copy(),
                originalBallotPathElements,
                command 
            }

        } catch (error: any) {
            // @todo look into how to design custom errors
            throw Error("no-op")
        }
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

    /**
     * Check whether a poll instance is equal to this instance
     * @param p - The poll instance
     * @returns whether the poll instance is equal to this instance
     */
    public equals = (p: Poll): boolean => {
        const result = 
            this.coordinatorKeyPair.equals(p.coordinatorKeyPair) &&
            this.treeDepths.intStateTreeDepth ===
            p.treeDepths.intStateTreeDepth &&
            this.treeDepths.messageTreeDepth ===
            p.treeDepths.messageTreeDepth &&
            this.treeDepths.messageTreeSubDepth ===
            p.treeDepths.messageTreeSubDepth &&
            this.treeDepths.voteOptionTreeDepth ===
            p.treeDepths.voteOptionTreeDepth &&
            this.batchSizes.tallyBatchSize === p.batchSizes.tallyBatchSize &&
            this.batchSizes.messageBatchSize ===
            p.batchSizes.messageBatchSize &&
            this.maxValues.maxUsers === p.maxValues.maxUsers &&
            this.maxValues.maxMessages === p.maxValues.maxMessages &&
            this.maxValues.maxVoteOptions === p.maxValues.maxVoteOptions &&
            this.messages.length === p.messages.length &&
            this.encPubKeys.length === p.encPubKeys.length

        if (!result) return false
        

        for (let i = 0; i < this.messages.length; i++) 
            if (!this.messages[i].equals(p.messages[i])) return false        
    
        for (let i = 0; i < this.encPubKeys.length; i++) 
            if (!this.encPubKeys[i].equals(p.encPubKeys[i])) return false
        
        // if we havent returned yet it means they are equal 
        return true
    }

    /**
     * Create a deep clone of the Poll instance
     * @returns a deep clone of the Poll instance
     */
    public copy = (): Poll => {
        const copied = new Poll(
            this.pollEndTimestamp,
            this.coordinatorKeyPair.copy(),
            {
                intStateTreeDepth: this.treeDepths.intStateTreeDepth,
                messageTreeDepth: this.treeDepths.messageTreeDepth,
                messageTreeSubDepth: this.treeDepths.messageTreeSubDepth,
                voteOptionTreeDepth: this.treeDepths.voteOptionTreeDepth,
            },
            {
                tallyBatchSize: this.batchSizes.tallyBatchSize,
                subsidyBatchSize: this.batchSizes.subsidyBatchSize,
                messageBatchSize: this.batchSizes.messageBatchSize,
            },
            {
                maxUsers: this.maxValues.maxUsers,
                maxMessages: this.maxValues.maxMessages,
                maxVoteOptions: this.maxValues.maxVoteOptions
            },
            this.maciStateRef,
            this.pollId
        )

        copied.stateLeaves = this.stateLeaves.map((x: StateLeaf) => x.copy())
        copied.messages = this.messages.map((x: Message) => x.copy())
        copied.commands = this.commands.map((x: Command) => x.copy())
        copied.ballots = this.ballots.map((x: Ballot) => x.copy())
        copied.encPubKeys = this.encPubKeys.map((x: PublicKey) => x.copy())
        if (this.ballotTree) copied.ballotTree = this.ballotTree.copy()
        copied.currentMessageBatchIndex = this.currentMessageBatchIndex
        copied.messageAq = this.messageAq.copy()
        copied.messageTree = this.messageTree.copy()
        copied.results = this.results.map((x: bigint) => x)
        copied.perVOSpentVoiceCredits = this.perVOSpentVoiceCredits.map((x: bigint) => x)
        copied.numBatchesProcessed = this.numBatchesProcessed 
        copied.numBatchesTallied = this.numBatchesTallied
        copied.totalSpentVoiceCredits = this.totalSpentVoiceCredits
        copied.sbSalts = {}
        copied.resultRootSalts = {}
        copied.preVOSpentVoiceCreditsRootSalts = {}
        copied.spentVoiceCreditSubtotalSalts = {}

        for (const k of Object.keys(this.sbSalts)) copied.sbSalts[k] = this.sbSalts[k]
        for (const k of Object.keys(this.resultRootSalts)) copied.resultRootSalts[k] = this.resultRootSalts[k]
        for (const k of Object.keys(this.preVOSpentVoiceCreditsRootSalts)) 
            copied.preVOSpentVoiceCreditsRootSalts[k] = this.preVOSpentVoiceCreditsRootSalts[k]
        for (const k of Object.keys(this.spentVoiceCreditSubtotalSalts)) 
            copied.spentVoiceCreditSubtotalSalts[k] = this.spentVoiceCreditSubtotalSalts[k]

        // @todo look if we want to keep the subsidy code 
        return copied 
    }

    /**
     * Generate the commitment to the poll results
     * @param _salt - The salt to use for the commitment
     * @returns the commitment (hash of the results tree root and the salt)
     */
    public genResultsCommitment = (_salt: bigint): bigint => {
        const resultsTree = new IncrementalQuinTree(
            this.treeDepths.voteOptionTreeDepth,
            BigInt(0),
            this.VOTE_OPTION_TREE_ARITY,
            hash5
        )

        for (const r of this.results) resultsTree.insert(r)
        
        return hashLeftRight(resultsTree.root, _salt)
    }

    /**
     * Generate a commitment to the total number of voice credits spent
     * @param _salt - The salt to use for the commitment
     * @param _numBallotsToCount - How many ballots to count 
     * @returns the commitment (hash of the total number of voice credits spent and the salt)
     */
    public genSpentVoiceCreditSubtotalCommitment = (
        _salt: bigint,
        _numBallotsToCount: number 
    ): bigint => {
        let subTotal = BigInt(0)

        for (let i = 0; i < _numBallotsToCount; i++)  {
            if (i >= this.ballots.length) break 
            for (let j = 0; j < this.results.length; j++) {
                const v = this.ballots[i].votes[j]
                subTotal += v * v
            }
        }

        return hashLeftRight(subTotal, _salt)
    }
}