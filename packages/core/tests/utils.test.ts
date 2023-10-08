import { describe, test, expect } from "bun:test"
import { genTallyResultCommitment, packProcessMessageSmallVals, unpackProcessMessageSmallVals } from "../src/utils"

describe("Core utils", () => {
    test('packProcessMessageSmallVals and unpackProcessMessageSmallVals', () => {
        const maxVoteOptions = BigInt(1)
        const numUsers = BigInt(2)
        const batchStartIndex = 5
        const batchEndIndex = 10
        const packedVals = packProcessMessageSmallVals(
            maxVoteOptions,
            numUsers,
            batchStartIndex,
            batchEndIndex
        )

        const unpacked = unpackProcessMessageSmallVals(packedVals)
        expect(unpacked.maxVoteOptions.toString()).toEqual(maxVoteOptions.toString())
        expect(unpacked.numUsers.toString()).toEqual(numUsers.toString())
        expect(unpacked.batchStartIndex.toString()).toEqual(batchStartIndex.toString())
        expect(unpacked.batchEndIndex.toString()).toEqual(batchEndIndex.toString())
    })
})