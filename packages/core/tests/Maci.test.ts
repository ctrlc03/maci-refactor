import { describe, expect, test } from "bun:test"
import { MaciState } from "../src/Maci"
import { STATE_TREE_DEPTH } from "../src"
import { IncrementalQuinTree, NOTHING_UP_MY_SLEEVE, genKeypair, hash5 } from "../../crypto/src"
import { Keypair, PrivateKey, PublicKey, StateLeaf, blankStateLeafHash } from "../../domainobjs/src"
import { MaxValues, TreeDepths } from "../types"

describe("MaciState", () => {
    const maxValues: MaxValues = {
        maxUsers: 100,
        maxMessages: 100,
        maxVoteOptions: 50,
    }

    const treeDepths: TreeDepths = {
        intStateTreeDepth: 4,
        messageTreeDepth: 4,
        messageTreeSubDepth: 2,
        voteOptionTreeDepth: 4,
    }

    const keyPair = genKeypair()
    const privKey = new PrivateKey(keyPair.privKey)
    const coordinatorKeyPair = new Keypair(privKey)

    const userKeyPair = genKeypair()
    const userPrivKey = new PrivateKey(userKeyPair.privKey)
    const userPubKey = new PublicKey(userKeyPair.pubKey)

    const voiceCreditBalance = BigInt(100)

    const maciState = new MaciState()
    const stateTree = new IncrementalQuinTree(
        STATE_TREE_DEPTH,
        blankStateLeafHash,
        5,
        hash5
    )
    stateTree.insert(blankStateLeafHash)
    const msgTree = new IncrementalQuinTree(
        treeDepths.messageTreeDepth,
        NOTHING_UP_MY_SLEEVE,
        5,
        hash5 
    )

    test("a new MACI state should have the correct zero values set", () => {
        const maciState = new MaciState()
        expect(maciState.stateTreeArity).toEqual(5)
        expect(maciState.stateTreeSubdepth).toEqual(2)
        expect(maciState.messageTreeArity).toEqual(5)
        expect(maciState.voteOptionTreeArity).toEqual(5)
        expect(maciState.stateTreeDepth).toEqual(STATE_TREE_DEPTH)
    })

    test("should allow to sign up a user", () => {
        const keyPair = genKeypair()
        const publicKey = new PublicKey(keyPair.pubKey)
        const maciState = new MaciState()
        const timestamp = BigInt(Date.now().valueOf())
        const leafIndex = maciState.signUp(publicKey, BigInt(5), timestamp)

        // empty leaf + 1 signup
        expect(maciState.stateLeaves.length).toEqual(2)
        expect(maciState.numSignUps).toEqual(1)
        expect(leafIndex).toEqual(1)        
    })

    test("deployNullPoll should store a null value in the polls array", () => {
        const maciState = new MaciState()
        maciState.deployNullPoll()
        expect(maciState.polls.length).toEqual(1)
        expect(maciState.polls[0]).toEqual(null)
    })

    test("copy should create a deep clone", () => {
        const maciState = new MaciState()
        const clone = maciState.copy()
        expect(maciState.equals(clone)).toBeTrue()
    })

    test("deployPoll should create a new poll instance", () => {
        const maciState = new MaciState()
        const pollId = maciState.deployPoll(100, maxValues, treeDepths, 10, coordinatorKeyPair)
        expect(maciState.polls.length).toEqual(1)
        expect(maciState.polls[0]).toBeDefined()
        expect(pollId).toEqual(maciState.polls.length - 1)
    })

    test("the state root should be correct after 1 signup", () => {
        const timestamp = BigInt(Date.now().valueOf())
        const stateLeaf = new StateLeaf(
            userPubKey,
            voiceCreditBalance,
            timestamp 
        )

        stateTree.insert(stateLeaf.hash())

        const stateIndex = maciState.signUp(
            userPubKey,
            voiceCreditBalance,
            timestamp
        )

        expect(stateIndex).toEqual(1)

        maciState.stateAq.mergeSubRoots(0)
        maciState.stateAq.merge(STATE_TREE_DEPTH)
        expect(maciState.stateAq.getRoot(STATE_TREE_DEPTH)).toEqual(stateTree.root)
    })

})