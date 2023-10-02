import {
    genPubKey,
    genKeypair,
    genEcdhSharedKey,
    encrypt,
    decrypt,
    sign,
    sha256Hash,
    hash5,
    hash13,
    verifySignature,
    genRandomSalt,
    elGamalEncryptBit,
    elGamalDecryptBit,
    genPrivKey,
    SNARK_FIELD_SIZE,
} from '../src/index'
import { describe, test, expect } from "bun:test"

describe('Cryptographic operations', () => {
    const { privKey, pubKey } = genKeypair()
    const k = genKeypair()

    const privKey1 = k.privKey
    const pubKey1 = k.pubKey

    const ecdhSharedKey = genEcdhSharedKey(privKey, pubKey1)
    const ecdhSharedKey1 = genEcdhSharedKey(privKey1, pubKey)

    const plaintext: any[] = []
    for (let i = 0; i < 5; i++) {
        plaintext.push(genRandomSalt())
    }

    const nonce = BigInt(123)

    const ciphertext = encrypt(plaintext, ecdhSharedKey, nonce)
    const decryptedCiphertext = decrypt(
        ciphertext,
        ecdhSharedKey,
        nonce,
        plaintext.length,
    )

    describe('Hashing', () => {
        test('The hash of a plaintext should be smaller than the snark field size', () => {
            const h = hash5([0, 1, 2, 3, 4].map((x) => BigInt(x)))
            expect(h < SNARK_FIELD_SIZE).toBeTruthy()

            const s = sha256Hash(plaintext)
            expect(s < SNARK_FIELD_SIZE).toBeTruthy()
        })
    })

    describe('sha256Hash', () => {
        test('sha256Hash ([0, 1])', () => {
            const s = sha256Hash([BigInt(0), BigInt(1)])
            expect(s.toString()).toEqual(
                '21788914573420223731318033363701224062123674814818143146813863227479480390499'
            )
        })
    })

    describe('hash13', () => {
        test('Hashing a smaller array should work', () => {
            const h = hash13([BigInt(1), BigInt(2), BigInt(3)])
            expect(h < SNARK_FIELD_SIZE).toBeTruthy()
        })

        test('Hashing more than 13 elements should throw', () => {
            const arr: any[] = []
            for (let i = 0; i < 14; i++) {
                arr.push(BigInt(i))
            }

            expect(() => hash13(arr)).toThrow(TypeError)
        })
    })

    describe('Public and private keys', () => {
        test('A private key should be smaller than the snark field size', () => {
            expect(privKey < SNARK_FIELD_SIZE).toBeTruthy()
            // TODO: add tests to ensure that the prune buffer step worked
        })

        test('A public key\'s constitutent values should be smaller than the snark field size', () => {
            // TODO: Figure out if these checks are correct and enough
            expect(pubKey[0] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(pubKey[1] < SNARK_FIELD_SIZE).toBeTruthy()
        })
    })

    describe('ECDH shared key generation', () => {
        test('The shared keys should match', () => {
            expect(ecdhSharedKey[0].toString()).toEqual(ecdhSharedKey1[0].toString())
            expect(ecdhSharedKey[1].toString()).toEqual(ecdhSharedKey1[1].toString())
        })

        test('A shared key should be smaller than the snark field size', () => {
            // TODO: Figure out if this check is correct and enough
            expect(ecdhSharedKey[0] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(ecdhSharedKey[1] < SNARK_FIELD_SIZE).toBeTruthy()
        })
    })

    describe('Encryption and decryption', () => {
        test('The ciphertext should be of the correct format', () => {
            const expectedLength = plaintext.length <= 3 ?
                4
                :
                1 + (plaintext.length % 3) * 3

            expect(ciphertext).toHaveLength(expectedLength)
        })

        test('The ciphertext should differ from the plaintext', () => {
            for (let i = 0; i < plaintext.length; i++) {
                expect(plaintext[i] !== ciphertext[i + 1]).toBeTruthy()
            }
        })

        test('The ciphertext should be smaller than the snark field size', () => {
            for (let i = 0; i < ciphertext.length; i++) {
                // TODO: Figure out if this check is correct and enough
                expect(ciphertext[i] < SNARK_FIELD_SIZE).toBeTruthy()
            }
        })

        test('The decrypted ciphertext should be correct', () => {
            for (let i = 0; i < decryptedCiphertext.length; i++) {
                expect(decryptedCiphertext[i]).toEqual(plaintext[i])
            }
        })

        test('The plaintext should be incorrect if decrypted with a different key', () => {
            const sk = BigInt(1)
            const pk = genPubKey(sk)
            const differentKey = genEcdhSharedKey(sk, pk)

            expect(() => {
                decrypt(ciphertext, differentKey, nonce, plaintext.length)
            }).toThrow()
        })
    })

    describe('Signature generation and verification', () => {
        const message = BigInt(Math.floor(Math.random() * 1000000000))
        const signature = sign(privKey, message)

        test('The signature should have the correct format and it constitutent parts should be smaller than the snark field size', () => {
            expect(signature).toHaveProperty('R8')
            expect(signature).toHaveProperty('S')
            expect(signature.R8[0] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(signature.R8[1] < SNARK_FIELD_SIZE).toBeTruthy()
            expect(signature.S < SNARK_FIELD_SIZE).toBeTruthy()
        })

        test('The signature should be valid', () => {
            const valid = verifySignature(
                message,
                signature,
                pubKey,
            )
            expect(valid).toBeTruthy()
        })

        test('The signature should be invalid for a different message', () => {
            const valid = verifySignature(
                message + BigInt(1),
                signature,
                pubKey,
            )
            expect(valid).toBeFalsy()
        })

        test('The signature should be invalid if tampered with', () => {
            const valid = verifySignature(
                message,
                {
                    R8: signature.R8,
                    S: BigInt(1),
                },
                pubKey,
            )
            expect(valid).toBeFalsy()
        })

        test('The signature should be invalid for a different public key', () => {
            const valid = verifySignature(
                message,
                signature,
                pubKey1,
            )
            expect(valid).toBeFalsy()
        })
    })

    describe('ElGamal bit encryption and decryption', () => {
        test('An encrypted bit should be successfuly decrypted back', () => {
            const { privKey, pubKey } = genKeypair();

            for (let bit = 0; bit < 2; bit ++) {
                const y = genPrivKey();

                const [c1, c2] = elGamalEncryptBit(pubKey, BigInt(bit), y);
                const dBit = elGamalDecryptBit(privKey, c1, c2);
                expect(BigInt(bit)).toEqual(dBit);
            }
        })

        test('Trying to encrypt bit > 1 throws Invalid bit value error', () => {
            const { pubKey } = genKeypair();
            const y = genPrivKey();

            expect(() => elGamalEncryptBit(pubKey, BigInt(2), y)).toThrow('Invalid bit value')
        })
        
        // TODO: Test 'Invalid point value' error in elGamalDecryptBit
        // test('Trying to decrypt point which is not 0 or G throws Invalid point value error', () => {
        //     const { privKey, pubKey } = genKeypair();
        //     const y = genPrivKey();

        //     const [c1, c2] = elGamalEncryptBtest(pubKey, BigInt(0), y);
        //     const dBit = elGamalDecryptBtest(privKey, c1, c2);
            
        //     expect(BigInt(0)).toEqual(dBit);
        // })
    })
})
