import { expect, test, describe } from "bun:test"
import { Keypair, PrivateKey } from "../src"

describe("privateKey", () => {
    test('PrivKey.serialize() and unserialize() should work correctly', () => {
        const k = new Keypair()
        const sk1 = k.privKey

        const s = sk1.serialize()
        expect(s.startsWith('macisk.')).toBeTruthy()

        const d = '0x' + s.slice(7)
        expect(sk1.rawPrivKey.toString()).toEqual(BigInt(d).toString())

        const c = PrivateKey.unserialize(s)
        expect(sk1.rawPrivKey.toString()).toEqual(BigInt(`${c.rawPrivKey}`).toString())
    })

    test('PrivKey.isValidSerializedPrivKey() should work correctly', () => {
        const k = new Keypair()
        const s = k.privKey.serialize()

        expect(PrivateKey.isValidSerializedPrivKey(s)).toBeTruthy()
        expect(PrivateKey.isValidSerializedPrivKey(s.slice(1))).toBeFalsy()
    })
})