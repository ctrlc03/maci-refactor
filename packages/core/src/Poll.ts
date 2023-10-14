import assert from "node:assert"
import { 
    Ballot, 
    Command, 
    Keypair,
    Message, 
    PCommand, 
    PublicKey, 
    StateLeaf, 
    TCommand,
    blankStateLeaf, 
    blankStateLeafHash
} from "../../domainobjs/src"
import { 
    BatchSizes, 
    MaxValues, 
    TreeDepths 
} from "../types"
import { 
    AccQueue, 
    NOTHING_UP_MY_SLEEVE, 
    SNARK_FIELD_SIZE, 
    genRandomSalt, 
    hash3, 
    hash4, 
    hash5, 
    hashLeftRight, 
    sha256Hash, 
    stringifyBigInts,
} from "../../crypto/src"
import { 
    STATE_TREE_DEPTH, 
    packProcessMessageSmallVals
} from "."
import { 
    MaciState
} from "./Maci"
import {
    OptimisedMT as IncrementalQuinTree 
} from "optimisedmt"

/**
 * @title Poll
 * @notice a Class representing a MACI Poll
 * @author PSE 
 */
export class Poll {
    // store the keypair of the coordinator (we only use the public key on chain)
    public coordinatorKeyPair: Keypair
    // the depths of the trees
    public treeDepths: TreeDepths
    // the batches sizes for more efficient processing
    public batchSizes: BatchSizes
    // the max values to conform with the 
    public maxValues: MaxValues

    // how many users signed up (from maci state)
    public numSignUps: number 
    // poll end timestamp
    public pollEndTimestamp: number 
    // a copy of all ballots
    public ballots: Ballot[] = []
    // the mekle tree holding all ballots
    // @todo find a better way to init this
    public ballotTree: IncrementalQuinTree = new IncrementalQuinTree(
        STATE_TREE_DEPTH,
        BigInt(5),
        5,
        hash5,
    )

    // a copy of all messages 
    public messages: Message[] = []
    // an accumulator queue holding these messages
    public messageAq: AccQueue
    // the merkle tree holding all messages
    public messageTree: IncrementalQuinTree
    // a copy of all commands
    public commands: Command[] = []

    // a copy of all encrypted public keys
    public encPubKeys: PublicKey[] = []
    // configs for the merkle trees
    public STATE_TREE_ARITY = 5
    public MESSAGE_TREE_ARITY = 5
    public VOTE_OPTION_TREE_ARITY = 5
    public DEACT_KEYS_TREE_ARITY = 5

    // at times we need to copy the state from the maci instance
    // this flag is used to check whether we have already copied the state
    public stateCopied = false
    // all of the state leaves (signups)
    public stateLeaves: StateLeaf[] = [blankStateLeaf]
    // the merkle tree holding these state leaves
    public stateTree = new IncrementalQuinTree(
        STATE_TREE_DEPTH,
        blankStateLeafHash,
        this.STATE_TREE_ARITY,
        hash5,
    )

    // For message processing
    // how many batches we processed so far
    public numBatchesProcessed = 0
    // the index of the current batch
    // @todo check if its ok to set a 0 
    public currentMessageBatchIndex: number = 0

    // reference to the maci state
    public maciStateRef: MaciState
    // the id of this poll
    public pollId: number

    // subsidy salts
    public sbSalts: { [key: number]: bigint } = {}
    // the salts for the results
    public resultRootSalts: { [key: number]: bigint } = {}
    public preVOSpentVoiceCreditsRootSalts: { [key: number]: bigint } = {}
    public spentVoiceCreditSubtotalSalts: { [key: number]: bigint } = {}

    // For vote tallying
    public results: bigint[] = []
    // how many credits were spent per vote option
    public perVOSpentVoiceCredits: bigint[] = []
    // how many batches we tallied
    public numBatchesTallied = 0

    // how many voice credits were spent in total
    public totalSpentVoiceCredits: bigint = BigInt(0)

    // For coefficient and subsidy calculation
    public subsidy: bigint[] = []  // size: M, M is number of vote options
    public subsidySalts: { [key: number]: bigint } = {}
    public rbi = 0 // row batch index
    public cbi = 0 // column batch index
    public MM = 50    // adjustable parameter
    public WW = 4     // number of digits for float representation

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
        // save the properties
        this.pollEndTimestamp = _pollEndTimestamp
        this.coordinatorKeyPair = _coordinatorKeypair
        this.treeDepths = _treeDepths
        this.batchSizes = _batchSizes
        this.maxValues = _maxValues
        this.maciStateRef = _maciStateRef
        this.numSignUps = this.maciStateRef.numSignUps 
        this.pollId = _pollId

        // create a new message tree to store the messages
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

        // @todo look into this - why we create one in the constructor 
        // for instance in the constructor we do not add to the ballot tree
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

        // @todo look into why we do this
        // @todo we instert a empty ballot for each of the sign ups 
        while (this.ballots.length < this.stateLeaves.length) {
            this.ballotTree.insert(emptyBallotHash)
            this.ballots.push(emptyBallot)
        }

        // update the number of users signed up 
        this.numSignUps = this.maciStateRef.numSignUps

        this.stateCopied = true
    }

    /**
     * Processes a topup message
     * @notice a top up message is of type 2
     * @param _message - the topup message object
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

        // @note this is the public key we use in the smart contracts
        // to pad the top up message
        const padKey = new PublicKey([
            BigInt('10457101036533406547632367118273992217979173478358440826365724437999023779287'),
            BigInt('19824078218392094440610104313265183977899662750282163392862422243483260492317'),
        ])

        this.encPubKeys.push(padKey)
        // we hash the message to create a leaf
        const messageLeaf = _message.hash(padKey)
        // and add it to the acc queue and the tree
        this.messageAq.enqueue(messageLeaf)
        this.messageTree.insert(messageLeaf)

        // @todo check if it's ok to pass the id as param 
        const command = new TCommand(
            _message.data[0], 
            _message.data[1],
            BigInt(this.pollId)
        )

        // save the command 
        this.commands.push(command)
    }

    /**
     * @notice Insert a Message and the pub key used to generate the 
     * shared key which encrypted the message
     * @param _message - The message object
     * @param _encPubKey - The public key used to encrypt the message
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
        // store it in the acc queue and the tree
        this.messageAq.enqueue(messageLeaf)
        this.messageTree.insert(messageLeaf)

        // now decrypt the message and store the command
        const sharedKey = Keypair.genEcdhSharedKey(
            this.coordinatorKeyPair.privKey,
            _encPubKey
        )

        // wrap the decryption in a try catch block
        try {
            const { command } = PCommand.decrypt(
                _message,
                sharedKey
            )
            this.commands.push(command)
        } catch (error: any) {
            const keyPair = new Keypair()
            // @todo check that the message type is correct (in the original version it was 0)
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
        // this checks that the acc queue subtree root is the same as the tree root
        assert(this.isMessageAqMerged(), "Poll:mergeAllMessages: message aq must be merged")
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
     * @returns The inputs for the processMessages circuit
     */
    public processMessages = async (): Promise<any> => {
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
            // if we haven't processed any batches, then the index shuold not be defined
            assert(this.currentMessageBatchIndex === undefined)
            // prevent other batches from being processed
            this.maciStateRef.pollBeingProcessed = true
            this.maciStateRef.currentPollBeingProcessed = this.pollId  

        // we check that if there is any poll being processed, it is this one
        if (this.maciStateRef.pollBeingProcessed) assert(this.maciStateRef.currentPollBeingProcessed === this.pollId)

        // this will only run once, before the first batch is processed 
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
        assert(
            this.currentMessageBatchIndex >= 0 && this.currentMessageBatchIndex % batchSize === 0, 
            'Poll:processMessages, Invalid current message batch index'
        )

        // ensure we copied MACI's state
        if (!this.stateCopied) this.copyStateFromMaci()

        // start building the circuit inputs object
        const circuitInputs = stringifyBigInts(
            await this.genProcessMessagesCircuitInputsPartial(this.currentMessageBatchIndex)
        )

        const currentStateLeaves: StateLeaf[] = []
        const currentStateLeavesPathElements: any[] = []

        const currentBallots: Ballot[] = []
        const currentBallotsPathElements: any[] = []

        const currentVoteWeights: bigint[] = []
        const currentVoteWeightsPathElements: any[] = []

        for (let i = 0; i < batchSize; i++) {
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
                    try {
                        // process it 
                        const r = this.processMessage(index)
                        
                        currentStateLeaves.unshift(r.originalStateLeaf)
                        currentBallots.unshift(r.originalBallot)
                        currentVoteWeights.unshift(r.originalVoteWeight)
                        currentVoteWeightsPathElements.unshift(r.originalVoteWeightsPathElements)
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

        this.numBatchesProcessed++

        if (this.currentMessageBatchIndex > 0) this.currentMessageBatchIndex -= batchSize 

        // @todo currentSbSalt should not equal newSbSalt 
        const newSbSalt = genRandomSalt()
        this.sbSalts[this.currentMessageBatchIndex] = newSbSalt

        circuitInputs.newSbSalt = newSbSalt

        circuitInputs.newSbCommitment = hash3([
            this.stateTree.root,
            this.ballotTree.root,
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
     * @returns The inputs for the processMessages circuit
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

        let msgs = this.messages.map((x) => x.asCircuitInputs())
        while (msgs.length % this.batchSizes.messageBatchSize > 0)
            msgs.push([...new Message(BigInt(1), Array(10).fill(BigInt(0))).asCircuitInputs(), BigInt(0)])

        msgs = msgs.slice(_index, _index + this.batchSizes.messageBatchSize)

        let commands = this.commands.map((x) => x.copy())
        // @todo how does this make sense? (pushing the last element)
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

        const currentSbCommitment = hash3([
            this.stateTree.root,
            this.ballotTree.root,
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
     * @returns The state leaves and ballots after processing all messages
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
            // @note this BigInt(100) is a placeholder
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

            const originalVoteWeightsPathElements = vt.genMerklePath(Number(command.voteOptionIndex.toString())).pathElements

            return {
                stateLeafIndex: Number(command.stateIndex),
                newStateLeaf,
                originalStateLeaf: stateLeaf.copy(),
                originalStateLeafPathElements,
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
     * Tally a batch of Ballots and update the result
     * @todo implement 
     */
    public tallyVotes = () => {
        // validation 
        assert(this.hasUntalliedBallots(), 'Poll:tallyVotes: No more ballots to tally')
        
        const batchSize = this.batchSizes.tallyBatchSize
        const batchStartIndex = this.numBatchesTallied * batchSize 

        const currentResultsRootSalt = batchStartIndex === 0 ? BigInt(0) : this.resultRootSalts[batchStartIndex - batchSize]

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
     * Checks whether the message acc queue was merged
     * @returns Whether the message acc queue was merged or not
     */
    public isMessageAqMerged = (): boolean => {
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
     * @returns Whether there are any unprocessed subsidy calculations
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

        // @todo can I avoid doing all these parseInt?
        for (const k of Object.keys(this.sbSalts)) copied.sbSalts[parseInt(k)] = this.sbSalts[parseInt(k)]
        for (const k of Object.keys(this.resultRootSalts)) copied.resultRootSalts[parseInt(k)] = this.resultRootSalts[parseInt(k)]
        for (const k of Object.keys(this.preVOSpentVoiceCreditsRootSalts)) 
            copied.preVOSpentVoiceCreditsRootSalts[parseInt(k)] = this.preVOSpentVoiceCreditsRootSalts[parseInt(k)]
        for (const k of Object.keys(this.spentVoiceCreditSubtotalSalts)) 
            copied.spentVoiceCreditSubtotalSalts[parseInt(k)] = this.spentVoiceCreditSubtotalSalts[parseInt(k)]

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