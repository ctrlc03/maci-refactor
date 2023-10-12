import { describe, test, expect } from "bun:test"
import {
    genProcessVkSig,
    genDeactivationVkSig,
    genTallyVkSig,
    genSubsidyVkSig,
    genNewKeyGenerationVkSig,
    packSubsidySmallVals,
    packTallyVotesSmallVals,
    unpackTallyVotesSmallVals,
    packProcessMessageSmallVals,
    unpackProcessMessageSmallVals
} from '../src'

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
    test('genProcessVkSig', () => {
        const result = genProcessVkSig(1, 2, 3, 4)
        const expected = (BigInt(4) << BigInt(192)) +
            (BigInt(1) << BigInt(128)) +
            (BigInt(2) << BigInt(64)) +
            BigInt(3)
        expect(result).toEqual(expected)
    })

    test('genDeactivationVkSig', () => {
        const result = genDeactivationVkSig(1, 2)
        const expected = (BigInt(1) << BigInt(64)) +
            BigInt(2)
        expect(result).toEqual(expected)
    })

    test('genTallyVkSig', () => {
        const result = genTallyVkSig(1, 2, 3)
        const expected = (BigInt(1) << BigInt(128)) +
            (BigInt(2) << BigInt(64)) +
            BigInt(3)
        expect(result).toEqual(expected)
    })

    test('genSubsidyVkSig', () => {
        const result = genSubsidyVkSig(1, 2, 3)
        const expected = (BigInt(1) << BigInt(128)) +
            (BigInt(2) << BigInt(64)) +
            BigInt(3)
        expect(result).toEqual(expected)
    })

    test('genNewKeyGenerationVkSig', () => {
        const result = genNewKeyGenerationVkSig(1, 2)
        const expected = (BigInt(1) << BigInt(128)) +
            BigInt(2)
        expect(result).toEqual(expected)
    })

    test('packSubsidySmallVals', () => {
        const result = packSubsidySmallVals(1, 2, 3)
        const expected = (BigInt(3) << BigInt(100)) +
            (BigInt(1) << BigInt(50)) +
            BigInt(2)
        expect(result).toEqual(expected)
    })

    test('packTallyVotesSmallVals', () => {
        const result = packTallyVotesSmallVals(4, 2, 3)
        const expected = (BigInt(4) / BigInt(2)) +
            (BigInt(3) << BigInt(50))
        expect(result).toEqual(expected)
    })

    test('unpackTallyVotesSmallVals', () => {
        const packedVals = (BigInt(4) / BigInt(2)) +
            (BigInt(3) << BigInt(50))
        const result = unpackTallyVotesSmallVals(packedVals)
        const expected = { numSignUps: BigInt(3), batchStartIndex: BigInt(2) }
        expect(result).toEqual(expected)
    })

    test('packProcessMessageSmallVals', () => {
        const result = packProcessMessageSmallVals(BigInt(1), BigInt(2), 3, 4)
        const expected = BigInt(1) +
            (BigInt(2) << BigInt(50)) +
            (BigInt(3) << BigInt(100)) +
            (BigInt(4) << BigInt(150))
        expect(result).toEqual(expected)
    })

    test('unpackProcessMessageSmallVals', () => {
        const packedVals = BigInt(1) +
            (BigInt(2) << BigInt(50)) +
            (BigInt(3) << BigInt(100)) +
            (BigInt(4) << BigInt(150))
        const result = unpackProcessMessageSmallVals(packedVals)
        const expected = {
            maxVoteOptions: BigInt(1),
            numUsers: BigInt(2),
            batchStartIndex: BigInt(3),
            batchEndIndex: BigInt(4)
        }
        expect(result).toEqual(expected)
    })
})