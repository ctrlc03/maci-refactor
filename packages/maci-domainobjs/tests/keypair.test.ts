import { expect, test, describe } from "bun:test"
import { Keypair, PrivateKey } from "../src"
import { genKeypair } from "../../crypto/src"

describe("keypair", () => {
    test('the Keypair constructor should generate a random keypair if not provided a private key', () => {
        const k1 = new Keypair()
        const k2 = new Keypair()

        expect(k1.equals(k2)).toBeFalsy()

        expect(k1.privKey.rawPrivKey).not.toEqual(k2.privKey.rawPrivKey)
    })

    test('the Keypair constructor should generate the correct public key given a private key', () => {
        const rawKeyPair = genKeypair()
        const k = new Keypair(new PrivateKey(rawKeyPair.privKey))
        expect(rawKeyPair.pubKey[0]).toEqual(k.pubKey.rawPubKey[0])
        expect(rawKeyPair.pubKey[1]).toEqual(k.pubKey.rawPubKey[1])
    })
})