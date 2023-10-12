import { describe, expect, test, beforeAll } from "bun:test"
import { MaciState } from "../src/Maci"
import { IncrementalQuinTree, NOTHING_UP_MY_SLEEVE, genKeypair, hash5 } from "../../crypto/src"
import { Keypair, PCommand, PrivateKey, PublicKey } from "../../maci-domainobjs/src"

describe("Poll", () => {
    // create an instance of maci state
    const maciState = new MaciState()

    // variables needed for the poll
    const endTimestamp = Date.now().valueOf() + 1000
    const maxValues = {
        maxUsers: 100,
        maxMessages: 100,
        maxVoteOptions: 50,
    }
    const treeDepths = {
        intStateTreeDepth: 4,
        messageTreeDepth: 4,
        messageTreeSubDepth: 2,
        voteOptionTreeDepth: 4,
    }

    const messageBatchSize = 10

    // coordinator keypair
    const keyPair = genKeypair()
    const privKey = new PrivateKey(keyPair.privKey)
    const coordinatorKeyPair = new Keypair(privKey)

    // deploy a poll
    const pollId = maciState.deployPoll(
        endTimestamp,
        maxValues,
        treeDepths,
        messageBatchSize,
        coordinatorKeyPair
    )

    const poll = maciState.polls[pollId]

    beforeAll(async () => {
        await poll.initNullifiersTree()
    })

    test("should have set the correct values upon instantiation", () => {
        const batchSizes =  {
            messageBatchSize: messageBatchSize,
            subsidyBatchSize: maciState.stateTreeArity ** treeDepths.intStateTreeDepth,
            tallyBatchSize: maciState.stateTreeArity ** treeDepths.intStateTreeDepth,
        }
        expect(poll.pollId).toEqual(0)
        expect(poll.pollEndTimestamp).toEqual(endTimestamp)
        expect(poll.coordinatorKeyPair).toEqual(coordinatorKeyPair)
        expect(poll.treeDepths).toEqual(treeDepths)
        expect(poll.maxValues).toEqual(maxValues)
        expect(poll.batchSizes).toEqual(batchSizes)
        expect(poll.maciStateRef).toEqual(maciState)
    })

    describe("copy", () => {
        test("copy should produce a deep copy", () => {
            const copy = poll.copy()
            const equals = poll.equals(copy)
            expect(equals).toEqual(true)
        })
    })

    describe("hasUntalliedBallots", () => {
        test("hasUntalliedBallots should return true when there are untallied ballots", () => {
            expect(poll.hasUntalliedBallots()).toEqual(true)
        })
    })
   
    describe("isMessageAqMerged", () => {
        test("isMessageAqMerged should return false when the message acc queue is not merged", () => {
            expect(poll.isMessageAqMerged()).toEqual(false)
        })
        test("isMessageAqMerged should return true when the message acc queue is merged", () => {})
    })

    describe("initNullifiersTree", () => {})
    describe("copyStateFromMaci", () => {})
    
    describe("publishMessage", () => { 
        // we need to sign up the user first
        const userKeyPair = genKeypair()
        const userPubKey = new PublicKey(userKeyPair.pubKey)
        const userPrivKey = new PrivateKey(userKeyPair.privKey)
        const maciState = new MaciState()
        const timestamp = BigInt(Date.now().valueOf())
        const leafIndex = maciState.signUp(userPubKey, BigInt(5), timestamp)
        const voteOptionIndex = BigInt(4)
        const voteWeight = BigInt(1) 

        const messageTree = new IncrementalQuinTree(
            treeDepths.messageTreeDepth,
            NOTHING_UP_MY_SLEEVE,
            5,
            hash5,
        )

        test("the message root should be correct after submitting one message", () => {
            // create a command
            const command = new PCommand(
                BigInt(leafIndex),
                userPubKey,
                voteOptionIndex,
                voteWeight,
                BigInt(1),
                BigInt(pollId)
            )

            // sign it 
            const signature = command.sign(userPrivKey)

            const ecdhKeypair = new Keypair()
            // generate a shared key between the user and the coordinator
            const sharedKey = Keypair.genEcdhSharedKey(
                ecdhKeypair.privKey,
                coordinatorKeyPair.pubKey
            )

            // encrypt the command
            const message = command.encrypt(signature, sharedKey)

            // publish it
            poll.publishMessage(message, ecdhKeypair.pubKey)
            // also store it in a local tree
            messageTree.insert(message.hash(ecdhKeypair.pubKey))
            // merge subroots
            poll.messageAq.mergeSubRoots(0)
            // merge the main tree
            poll.messageAq.merge(treeDepths.messageTreeDepth)

            // we check that the two roots are the same 
            expect(poll.messageAq.getRoot(treeDepths.messageTreeDepth).toString())
            .toEqual(messageTree.root.toString())
        })  
    })

    describe("processMessages", () => {})
})