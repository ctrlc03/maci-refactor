import { describe, expect, test} from "bun:test"
import { DeactivatedKeyLeaf } from "../src"

describe("deactivatedKeyLeaf", () => {
    test("serialize() and unserialize() should work correctly", () => {
        const key = DeactivatedKeyLeaf.genRandomLeaf()
        const serialized = key.serialize()
        const unserialized = DeactivatedKeyLeaf.unserialize(serialized)
        expect(unserialized.equals(key)).toBeTrue()
    })

    test("copy() should produce a deep copy", () => {
        const first = DeactivatedKeyLeaf.genRandomLeaf()
        const second = first.copy()
        expect(first.equals(second)).toBeTrue()
    })

    test("asContractParam should generate a valid object", () => {
        const key = DeactivatedKeyLeaf.genRandomLeaf()
        const param = key.asContractParam()
        expect(param).toBeInstanceOf(Object)
        expect(param).toHaveProperty("pubKeyHash")
        expect(param).toHaveProperty("c1")
        expect(param).toHaveProperty("c2")
    })
    test("asCircuitParam should return an array", () => {
        const key = DeactivatedKeyLeaf.genRandomLeaf()
        const param = key.asCircuitInputs()
        expect(param).toBeInstanceOf(Array)
        expect(param.length).toEqual(5)
    })
})