import { describe, expect, test } from "bun:test"
import { Keypair, Message, PCommand } from "../src"
import { genRandomSalt } from "../../crypto/src"

describe("Commands & Messages", () => {
    const { privKey, pubKey } = new Keypair()
    const k = new Keypair()

    const pubKey1 = k.pubKey

    const newPubKey = k.pubKey

    const ecdhSharedKey = Keypair.genEcdhSharedKey(privKey, pubKey1)
    const random50bitBigInt = (): bigint => {
        return (
            (BigInt(1) << BigInt(50)) - BigInt(1)
        ) & BigInt(`${genRandomSalt()}`)
    }
    const command: PCommand = new PCommand(
        random50bitBigInt(),
        newPubKey,
        random50bitBigInt(),
        random50bitBigInt(),
        random50bitBigInt(),
        random50bitBigInt(),
        genRandomSalt(),
    )
    const signature = command.sign(privKey)
    const message = command.encrypt(signature, ecdhSharedKey)
    const decrypted = PCommand.decrypt(message, ecdhSharedKey)

    test('command.sign() should produce a valid signature', () => {
        expect(command.verifySignature(signature, pubKey)).toBeTruthy()
    })
    
    test('decrypted message should match the original command', () => {
        expect(decrypted.command.equals(command)).toBeTruthy()
        expect(decrypted.signature.R8[0].toString()).toEqual(signature.R8[0].toString())
        expect(decrypted.signature.R8[1].toString()).toEqual(signature.R8[1].toString())
        expect(decrypted.signature.S.toString()).toEqual(signature.S.toString())
    })

    test('decrypted message should have a valid signature', () => {
        const isValid = decrypted.command.verifySignature(decrypted.signature, pubKey) 
        expect(isValid).toBeTruthy()
    })

    test('Command.copy() should produce a deep copy', () => {
        const c1: PCommand = new PCommand(
            BigInt(10),
            newPubKey,
            BigInt(0),
            BigInt(9),
            BigInt(1),
            BigInt(123),
        )

        // shallow copy
        const c2 = c1
        c1.nonce = BigInt(9999)
        expect(c1.nonce.toString()).toEqual(c2.nonce.toString())

        // deep copy
        const c3 = c1.copy()
        c1.nonce = BigInt(8888)

        expect(c1.nonce.toString()).not.toEqual(c3.nonce.toString())
    })

    test("message.copy() should produce a deep copy", () => {
        const m1 = new Message(
            BigInt(1),
            [BigInt(2), BigInt(3), BigInt(4), BigInt(5), BigInt(6), BigInt(7), BigInt(8), BigInt(9), BigInt(10), BigInt(11)]
        )

        const m2 = m1.copy()
        expect(m2.equals(m1)).toBeTrue()
    })

    test("message.asCircuitInputs() should return a array", () => {
        const m1 = new Message(
            BigInt(1),
            [BigInt(2), BigInt(3), BigInt(4), BigInt(5), BigInt(6), BigInt(7), BigInt(8), BigInt(9), BigInt(10), BigInt(11)]
        )    

        const arr = m1.asCircuitInputs()
        expect(arr.length).toEqual(11)
        expect(arr[0]).toEqual(BigInt(1))
        expect(arr[1]).toEqual(BigInt(2))
        expect(arr[2]).toEqual(BigInt(3))
        expect(arr[3]).toEqual(BigInt(4))
        expect(arr[4]).toEqual(BigInt(5))
        expect(arr[5]).toEqual(BigInt(6))
        expect(arr[6]).toEqual(BigInt(7))
        expect(arr[7]).toEqual(BigInt(8))
        expect(arr[8]).toEqual(BigInt(9))
        expect(arr[9]).toEqual(BigInt(10))
        expect(arr[10]).toEqual(BigInt(11))
        expect(arr).toBeArray()
    })
})