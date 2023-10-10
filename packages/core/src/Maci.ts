import { AccQueue, hash5, IncrementalQuinTree } from "../../crypto/src"
import { Keypair, PublicKey, StateLeaf, blankStateLeaf, blankStateLeafHash } from "../../domainobjs/src"
import { MaxValues, TreeDepths } from "../types"
import { STATE_TREE_DEPTH } from "./constants"
import { Poll } from "./Poll"

/**
 * @title MaciState
 * @notice a Class representing a MACI State
 * @dev This class is used to store the state of a MACI instance
 * @author PSE 
 */
export class MaciState {
    // trees config values
    public stateTreeArity: number 
    public stateTreeSubdepth: number 
    public messageTreeArity: number 
    public voteOptionTreeArity: number 
    public stateTreeDepth: number 

    // an array of all polls generated
    public polls: Poll[] = []
    // an array of all state leaves (signups)
    public stateLeaves: StateLeaf[] = []
    public stateTree: IncrementalQuinTree 
    public stateAq: AccQueue

    public pollBeingProcessed: boolean = false 
    public currentPollBeingProcessed: number 
    public numSignUps: number = 0 

    /**
     * Create a new instance of the MaciState class
     * @param _stateTreeArity 
     * @param _messageTreeArity 
     * @param _voteOptionTreeArity 
     * @param _stateTreeDepth 
     * @param _stateTreeSubDepth 
     */
    constructor(
        _stateTreeArity: number = 5,
        _messageTreeArity: number = 5,
        _voteOptionTreeArity: number = 5,
        _stateTreeDepth: number = STATE_TREE_DEPTH,
        _stateTreeSubDepth: number = 2
    ) {
        this.stateTreeArity = _stateTreeArity
        this.messageTreeArity = _messageTreeArity
        this.voteOptionTreeArity = _voteOptionTreeArity
        this.stateTreeDepth = _stateTreeDepth
        this.stateTreeSubdepth = _stateTreeSubDepth

        this.stateTree = new IncrementalQuinTree(
            this.stateTreeDepth, 
            blankStateLeafHash, 
            this.stateTreeArity,
            hash5
        )
        this.stateAq = new AccQueue(
            this.stateTreeSubdepth,
            this.stateTreeArity,
            blankStateLeafHash
        )

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

    /**
     * Deploy a new poll
     * @param _pollEndTimestamp When the poll should end
     * @param _maxValues The Max values for the circuit params
     * @param _treeDepths The depths of the merkle trees
     * @param _messageBatchSize The sizes of the message batches
     * @param _coordinatorKeypair The keypair of the coordinator
     * @retruns the id of the new poll 
     */
    public deployPoll = (
        _pollEndTimestamp: number,
        _maxValues: MaxValues,
        _treeDepths: TreeDepths,
        _messageBatchSize: number,
        _coordinatorKeypair: Keypair
    ): number => {
        // create the new poll object
        const poll: Poll = new Poll(
            _pollEndTimestamp,
            _coordinatorKeypair,
            _treeDepths,
            {
                messageBatchSize: _messageBatchSize,
                subsidyBatchSize: this.stateTreeArity ** _treeDepths.intStateTreeDepth,
                tallyBatchSize: this.stateTreeArity ** _treeDepths.intStateTreeDepth,
            },
            _maxValues,
            this,
            this.polls.length
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
            this.stateTreeArity === m.stateTreeArity &&
            this.messageTreeArity === m.messageTreeArity &&
            this.voteOptionTreeArity === m.voteOptionTreeArity &&
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
}