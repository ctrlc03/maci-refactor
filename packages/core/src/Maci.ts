import { AccQueue, hash5, IncrementalQuinTree } from "../../crypto/src"
import { Keypair, PublicKey, StateLeaf } from "../../domainobjs/src"
import { MaxValues, TreeDepths } from "../types"
import { blankStateLeaf, blankStateLeafHash, STATE_TREE_DEPTH } from "./constants"
import { Poll } from "./Poll"
import assert from "node:assert"

/**
 * @title MaciState
 * @notice a Class representing a MACI State
 * @dev This class is used to store the state of a MACI instance
 * @author PSE 
 */
export class MaciState {
    public STATE_TREE_ARITY = 5
    public STATE_TREE_SUBDEPTH = 2
    public MESSAGE_TREE_ARITY = 5
    public VOTE_OPTION_TREE_ARITY = 5

    public stateTreeDepth = STATE_TREE_DEPTH

    public polls: Poll[] = []
    public stateLeaves: StateLeaf[] = []
    public stateTree = new IncrementalQuinTree(
        this.stateTreeDepth, 
        blankStateLeafHash, 
        this.STATE_TREE_ARITY,
        hash5
    )

    public stateAq = new AccQueue(
        this.STATE_TREE_SUBDEPTH,
        this.STATE_TREE_ARITY,
        blankStateLeafHash
    )

    public pollBeingProcessed: boolean 
    public currentPollBeingProcessed: number
    public numSignUps: number 

    constructor() {
        this.stateLeaves.push(blankStateLeaf)
        this.stateTree.insert(blankStateLeafHash)
        this.stateAq.enqueue(blankStateLeafHash)
    }

    /**
     * Signup a new public key 
     * @param _pubKey the public key of the new signup
     * @param _initialVoiceCreditBalance the initial voice credit balance of the new signup
     * @param _timestamp the timestamp of the new signup
     * @returns the state index of the new signup 
     */
    public signUp = (
        _pubKey: PublicKey,
        _initialVoiceCreditBalance: bigint,
        _timestamp: bigint
    ): number => {
        const stateLeaf = new StateLeaf(
            _pubKey,
            _initialVoiceCreditBalance,
            _timestamp
        )

        const leafIndex = this.stateAq.enqueue(
            stateLeaf.hash()
        )

        this.stateTree.insert(stateLeaf.hash())
        this.stateLeaves.push(stateLeaf.copy())

        // increase number of signups recorded
        // @todo we need to validate that it's not > than supported
        // by the circuit params 
        this.numSignUps++
        // return the state index of the new signup
        return leafIndex
    }

    // @todo do we really need both duration and end timestamp?
    /**
     * Deploy a new poll
     * @param _duration How long the poll should last
     * @param _pollEndTimestamp When the poll should end
     * @param _maxValues The Max values for the circuit params
     * @param _treeDepths The depths of the merkle trees
     * @param _messageBatchSize The sizes of the message batches
     * @param _coordinatorKeypair The keypair of the coordinator
     * @retruns the id of the new poll 
     */
    public deployPoll = (
        _duration: number,
        _pollEndTimestamp: bigint,
        _maxValues: MaxValues,
        _treeDepths: TreeDepths,
        _messageBatchSize: number,
        _coordinatorKeypair: Keypair
    ): number => {
        // create the new poll object
        const poll: Poll = new Poll(
            _duration,
            _pollEndTimestamp,
            _coordinatorKeypair,
            _treeDepths,
            {
                messageBatchSize: _messageBatchSize,
                subsidyBatchSize: this.STATE_TREE_ARITY ** _treeDepths.intStateTreeDepth,
                tallyBatchSize: this.STATE_TREE_ARITY ** _treeDepths.intStateTreeDepth,
            },
            _maxValues,
            this
        )

        // save it 
        this.polls.push(poll)
        // retun the ID 
        return this.polls.length - 1
    }

    /**
     * Deploy a null Poll 
     * @todo check whether this can be omitted
     */
    public deployNullPoll() { 
        // @ts-ignore
        this.polls.push(null) 
    }

    /**
     * Create a copy of the current state
     * @returns the state copy
     */
    public copy = (): MaciState => {
        const copied = new MaciState()

        copied.stateLeaves = this.stateLeaves.map((x: StateLeaf) => x.copy())
        copied.polls = this.polls.map((x: Poll) => x.copy())

        return copied 
    }

    /**
     * Check whether two Maci states are equal
     * @param m The state to compare to
     * @returns whether the two states are equal
     */
    public equals = (m: MaciState): boolean => {
        const result =
            this.STATE_TREE_ARITY === m.STATE_TREE_ARITY &&
            this.MESSAGE_TREE_ARITY === m.MESSAGE_TREE_ARITY &&
            this.VOTE_OPTION_TREE_ARITY === m.VOTE_OPTION_TREE_ARITY &&
            this.stateTreeDepth === m.stateTreeDepth &&
            this.polls.length === m.polls.length &&
            this.stateLeaves.length === m.stateLeaves.length

        if (!result) return false

        for (let i = 0; i < this.polls.length; i++) {
            if (!this.polls[i].equals(m.polls[i])) {
                return false
            }
        }
        for (let i = 0; i < this.stateLeaves.length; i++) {
            if (!this.stateLeaves[i].equals(m.stateLeaves[i])) {
                return false
            }
        }

        return true
    }

    /**
     * Pack the subsidy small values
     * @param row 
     * @param col 
     * @param numSignUps 
     * @returns The packed values
     */
    public static packSubsidySmallVals = (
        row: number,
        col: number,
        numSignUps: number,
    ): bigint => {
        // Note: the << operator has lower precedence than +
        const packedVals =
            (BigInt(numSignUps) << BigInt(100)) +
            (BigInt(row) << BigInt(50)) +
            BigInt(col)
        return packedVals
    }

    /**
     * Pack the Tally Votes values
     * @param batchStartIndex 
     * @param batchSize 
     * @param numSignUps 
     * @returns The packed values
     */
    public static packTallyVotesSmallVals = (
        batchStartIndex: number,
        batchSize: number,
        numSignUps: number,
    ): bigint => {
        // Note: the << operator has lower precedence than +
        const packedVals =
            (BigInt(batchStartIndex) / BigInt(batchSize)) +
            (BigInt(numSignUps) << BigInt(50))

        return packedVals
    }

    /**
     * Unpack the previously packed tally values
     * @param packedVals The packed values
     * @returns The unpacked values
     */
    public static unpackTallyVotesSmallVals = (
        packedVals: bigint,
    ): any => {
        let asBin = packedVals.toString(2)
        assert(asBin.length <= 100)
        while (asBin.length < 100) {
            asBin = '0' + asBin
        }
        const numSignUps = BigInt('0b' + asBin.slice(0, 50))
        const batchStartIndex = BigInt('0b' + asBin.slice(50, 100))

        return { numSignUps, batchStartIndex }
    }
    
    /**
     * Pack process messages values
     * @param maxVoteOptions 
     * @param numUsers 
     * @param batchStartIndex 
     * @param batchEndIndex 
     * @returns 
     */
    public static packProcessMessageSmallVals = (
        maxVoteOptions: bigint,
        numUsers: bigint,
        batchStartIndex: number,
        batchEndIndex: number,
    ): bigint => {
        return BigInt(`${maxVoteOptions}`) +
            (BigInt(`${numUsers}`) << BigInt(50)) +
            (BigInt(batchStartIndex) << BigInt(100)) +
            (BigInt(batchEndIndex) << BigInt(150))
    }

    /**
     * Unpack previously packed process message values
     * @param packedVals The packed values
     * @returns The unpacked values
     */
    public static unpackProcessMessageSmallVals = (
        packedVals: bigint,
    ) => {
        let asBin = (packedVals).toString(2)
        assert(asBin.length <= 200)
        while (asBin.length < 200) {
            asBin = '0' + asBin
        }
        const maxVoteOptions = BigInt('0b' + asBin.slice(150, 200))
        const numUsers = BigInt('0b' + asBin.slice(100, 150))
        const batchStartIndex = BigInt('0b' + asBin.slice(50, 100))
        const batchEndIndex = BigInt('0b' + asBin.slice(0, 50))

        return {
            maxVoteOptions,
            numUsers,
            batchStartIndex,
            batchEndIndex,
        }
    }
}