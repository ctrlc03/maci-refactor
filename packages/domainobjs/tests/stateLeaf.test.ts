import { describe, expect, test } from "bun:test"
import { Keypair, StateLeaf } from "../src"

describe('State leaves', () => {
    const { pubKey } = new Keypair()

    test('serialize() and unserialize() functions should work correctly', () => {
        const stateLeaf = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231267),
        )

        const serialized = stateLeaf.serialize()
        const unserialized = StateLeaf.unserialize(serialized)

        expect(
            unserialized.voiceCreditBalance.toString()
            ).toEqual(stateLeaf.voiceCreditBalance.toString())
    })

    test("copy should create an exact copy of the state leaf", () => {
        const stateLeaf = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231267),
        )

        const copy = stateLeaf.copy()

        expect(stateLeaf.equals(copy)).toBeTrue()
    })

    test("genRandomLeaf should return a random leaf", () => {
        const randomLeaf = StateLeaf.genRandomLeaf()
        const randomLeaf2 = StateLeaf.genRandomLeaf()
        expect(randomLeaf.equals(randomLeaf2)).toBeFalse()
    })

    test("asCircuitInputs should return an array", () => {
        const stateLeaf = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231267),
        )

        const arr = stateLeaf.asCircuitInputs()
        expect(arr).toBeArray()
        expect(arr.length).toBeGreaterThan(0)
        expect(arr.length).toBe(4)
    })

    test("equals should return true when comparing two equal state leaves", () => {
        const stateLeaf = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231267),
        )

        const stateLeaf2 = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231267),
        )

        expect(stateLeaf.equals(stateLeaf2)).toBeTrue()
    })

    test("equals should return false when comparing two different state leaves", () => {
        const stateLeaf = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231267),
        )

        const stateLeaf2 = new StateLeaf(
            pubKey,
            BigInt(123),
            BigInt(1231268),
        )

        expect(stateLeaf.equals(stateLeaf2)).toBeFalse()
    })
})