import { describe, expect, test } from "bun:test"
import { MaciState } from "../src/Maci"
import { genKeypair } from "../../crypto/src"
import { Keypair, PrivateKey } from "../../domainobjs/src"

describe("Poll", () => {

    const maciState = new MaciState()

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

    const keyPair = genKeypair()
    const privKey = new PrivateKey(keyPair.privKey)
    const coordinatorKeyPair = new Keypair(privKey)

    const pollId = maciState.deployPoll(
        endTimestamp,
        maxValues,
        treeDepths,
        messageBatchSize,
        coordinatorKeyPair
    )

    const poll = maciState.polls[pollId]

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

    test("copy should produce a deep copy", () => {
        const copy = poll.copy()
        const equals = poll.equals(copy)
        expect(equals).toEqual(true)
    })

})