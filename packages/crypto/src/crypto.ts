import assert from "node:assert"
import { randomBytes } from "crypto"
import { 
    SNARK_FIELD_SIZE,
    bigInt2Buffer,
} from "./index"
import { solidityPackedSha256 } from "ethers"
import { babyJub, poseidon, poseidonEncrypt, poseidonDecrypt, eddsa } from 'circomlib'
import createBlakeHash from "blake-hash"
import * as ff from 'ffjavascript'
import {
    Ciphertext,
    EcdhSharedKey,
    Plaintext, 
    Point, 
    PrivKey, 
    PubKey, 
    PoseidonFuncs, 
    Keypair, 
    Signature
} from "../types/types"

/**
 * @notice A class representing a point on the first group (G1)
 * of the Jubjub curve
 */
export class G1Point {
    public x: bigint
    public y: bigint

    constructor (
        _x: bigint,
        _y: bigint,
    ) {
        assert(_x < SNARK_FIELD_SIZE && _x > 0, 'G1Point x out of range')
        assert(_y < SNARK_FIELD_SIZE && _y > 0, 'G1Point y out of range')
        this.x = _x
        this.y = _y
    }

    public equals(pt: G1Point): boolean {
        return this.x === pt.x && this.y === pt.y
    }

    public asContractParam() {
        return {
            x: this.x.toString(),
            y: this.y.toString(),
        }
    }
}

/**
 * @notice A class representing a point on the second group (G2)
 * of the Jubjub curve. This is usually an extension field of the
 * base field of the curve. 
 */
export class G2Point {
    public x: bigint[]
    public y: bigint[]

    constructor (
        _x: bigint[],
        _y: bigint[],
    ) {
        for (const n of _x) assert(n < SNARK_FIELD_SIZE && n > 0, 'G2Point x out of range')
        for (const n of _y) assert(n < SNARK_FIELD_SIZE && n > 0, 'G2Point y out of range')
        this.x = _x
        this.y = _y
    }

    public equals(pt: G2Point): boolean {
        return this.x[0] === pt.x[0] &&
               this.x[1] === pt.x[1] &&
               this.y[0] === pt.y[0] &&
               this.y[1] === pt.y[1]
    }

    public asContractParam() {
        return {
            x: this.x.map((n) => n.toString()),
            y: this.y.map((n) => n.toString()),
        }
    }
}

/**
 * Hash an array of uint256 values the same way that the EVM does.
 */
export const sha256Hash = (input: bigint[]) => {
    const types: string[] = []
    for (let i = 0; i < input.length; i ++) {
        types.push('uint256')
    }
    return BigInt(
       solidityPackedSha256(
            types,
            input.map((x) => x.toString()),
        ),
    ) % SNARK_FIELD_SIZE
}

/**
 * Hash two BigInts with the Poseidon hash function
 * @param left The left-hand element to hash
 * @param right The right-hand element to hash
 */
export const hashLeftRight = (left: bigint, right: bigint): bigint => {
    return poseidonT3([left, right])
}

// Hash up to 2 elements
export const poseidonT3 = (inputs: bigint[]) => {
    assert(inputs.length === 2)
    return poseidon(inputs)
}

// Hash up to 3 elements
export const poseidonT4 = (inputs: bigint[]) => {
    assert(inputs.length === 3)
    return poseidon(inputs)
}

// Hash up to 4 elements
export const poseidonT5 = (inputs: bigint[]) => {
    assert(inputs.length === 4)
    return poseidon(inputs)
}

// Hash up to 5 elements
export const poseidonT6 = (inputs: bigint[]) => {
    assert(inputs.length === 5)
    return poseidon(inputs)
}

export const hashN = (numElements: number, elements: Plaintext): bigint => {
    const elementLength = elements.length
    if (elements.length > numElements) {
        throw new TypeError(`the length of the elements array should be at most ${numElements}; got ${elements.length}`)
    }
    const elementsPadded = elements.slice()
    if (elementLength < numElements) {
        for (let i = elementLength; i < numElements; i++) {
            elementsPadded.push(BigInt(0))
        }
    }

    const funcs: PoseidonFuncs = {
        2: poseidonT3,
        3: poseidonT4,
        4: poseidonT5,
        5: poseidonT6,
    }

    return funcs[numElements](elements)
}

export const hash2 = (elements: Plaintext): bigint => hashN(2, elements)
export const hash3 = (elements: Plaintext): bigint => hashN(3, elements)
export const hash4 = (elements: Plaintext): bigint => hashN(4, elements)
export const hash5 = (elements: Plaintext): bigint => hashN(5, elements)
export const hash9 = (elements: Plaintext): bigint => hashN(9, elements)

/**
 * A convenience function to use Poseidon to hash a Plaintext with
 * no more than 13 elements
 */
export const hash13 = (elements: Plaintext): bigint => {
    const max = 13
    const elementLength = elements.length
    if (elementLength > max) {
        throw new TypeError(`the length of the elements array should be at most ${max}; got ${elements.length}`)
    }
    const elementsPadded = elements.slice()
    if (elementLength < max) {
        for (let i = elementLength; i < max; i++) {
            elementsPadded.push(BigInt(0))
        }
    }
    return poseidonT6([
        elementsPadded[0],
        poseidonT6(elementsPadded.slice(1, 6)),
        poseidonT6(elementsPadded.slice(6, 11)),
        elementsPadded[11],
        elementsPadded[12],
    ])
}

/**
 * Hash a single BigInt with the Poseidon hash function
 */
export const hashOne = (preImage: bigint): bigint => poseidonT3([preImage, BigInt(0)])


/**
 * Returns a BabyJub-compatible random value. We create it by first generating
 * a random value (initially 256 bits large) modulo the snark field size as
 * described in EIP197. This results in a key size of roughly 253 bits and no
 * more than 254 bits. To prevent modulo bias, we then use this efficient
 * algorithm:
 * http://cvsweb.openbsd.org/cgi-bin/cvsweb/~checkout~/src/lib/libc/crypt/arc4random_uniform.c
 * @return A BabyJub-compatible random value.
 */
export const genRandomBabyJubValue = (): bigint => {
    // Prevent modulo bias
    //const lim = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000')
    //const min = (lim - SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE
    const min = BigInt('6350874878119819312338956282401532410528162663560392320966563075034087161851')

    let rand: bigint = BigInt(0)
    while (true) {
        rand = BigInt('0x' + randomBytes(32).toString('hex'))

        if (rand >= min) {
            break
        }
    }

    const privKey: PrivKey = rand % SNARK_FIELD_SIZE
    assert(privKey < SNARK_FIELD_SIZE)

    return privKey
}

/**
 * @return A BabyJub-compatible private key.
 */
export const genPrivKey = (): bigint => {
    return genRandomBabyJubValue()
}

/**
 * @return A BabyJub-compatible salt.
 */
export const genRandomSalt = (): bigint => {
    return genRandomBabyJubValue()
}

/**
 * An internal function which formats a random private key to be compatible
 * with the BabyJub curve. This is the format which should be passed into the
 * PubKey and other circuits.
 */
export const formatPrivKeyForBabyJub = (privKey: PrivKey) => {
    const sBuff = eddsa.pruneBuffer(
        createBlakeHash("blake512").update(
            bigInt2Buffer(privKey),
        ).digest().slice(0,32)
    )
    const s = ff.utils.leBuff2int(sBuff)
    return ff.Scalar.shr(s, 3)
}

/**
 * Losslessly reduces the size of the representation of a public key
 * @param pubKey The public key to pack
 * @return A packed public key
 */
export const packPubKey = (pubKey: PubKey): Buffer => {
    return babyJub.packPoint(pubKey)
}

/**
 * Restores the original PubKey from its packed representation
 * @param packed The value to unpack
 * @return The unpacked public key
 */
export const unpackPubKey = (packed: Buffer): PubKey | any => {
    return babyJub.unpackPoint(packed)
}

/**
 * @param privKey A private key generated using genPrivKey()
 * @return A public key associated with the private key
 */
export const genPubKey = (privKey: PrivKey): PubKey => {
    // Check whether privKey is a field element
    assert(privKey < SNARK_FIELD_SIZE)
    return eddsa.prv2pub(bigInt2Buffer(privKey))
}

/**
 * Generates a keypair.
 * @returns a keypair
 */
export const genKeypair = (): Keypair => {
    const privKey = genPrivKey()
    const pubKey = genPubKey(privKey)

    const Keypair: Keypair = { privKey, pubKey }

    return Keypair
}

/**
 * Generates an Elliptic-Curve Diffie–Hellman (ECDH) shared key given a private
 * key and a public key.
 * @param privKey A private key generated using genPrivKey()
 * @param pubKey A public key generated using genPubKey()
 * @return The ECDH shared key.
 */
export const genEcdhSharedKey = (
    privKey: PrivKey,
    pubKey: PubKey,
): EcdhSharedKey => {
    return babyJub.mulPointEscalar(pubKey, formatPrivKeyForBabyJub(privKey))
}

/**
 * Encrypts a plaintext using a given key.
 * @return The ciphertext.
 */
export const encrypt = (
    plaintext: Plaintext,
    sharedKey: EcdhSharedKey,
    nonce = BigInt(0),
): Ciphertext => {
    const ciphertext = poseidonEncrypt(
        plaintext,
        sharedKey,
        nonce,
    )
    return ciphertext
}

/**
 * Decrypts a ciphertext using a given key.
 * @return The plaintext.
 */
export const decrypt = (
    ciphertext: Ciphertext,
    sharedKey: EcdhSharedKey,
    nonce: BigInt,
    length: number,
): Plaintext => {

    const plaintext = poseidonDecrypt(
        ciphertext,
        sharedKey,
        nonce,
        length,
    )
    return plaintext
}

/**
 * Generates a signature given a private key and plaintext.
 * @param privKey A private key generated using genPrivKey()
 * @param msg The plaintext to sign.
 * @return The signature.
 */
export const sign = (
    privKey: PrivKey,
    msg: BigInt,
): Signature => {
    return eddsa.signPoseidon(
        bigInt2Buffer(privKey),
        msg,
    )
}

/**
 * Checks whether the signature of the given plaintext was created using the
 * private key associated with the given public key.
 * @param msg The plaintext to verify.
 * @param signature The signature to verify.
 * @param pubKey The public key to use for verification.
 * @return True if the signature is valid, and false otherwise.
 */
export const verifySignature = (
    msg: bigint,
    signature: Signature,
    pubKey: PubKey,
): boolean => {
    return eddsa.verifyPoseidon(msg, signature, pubKey)
}

/** 
 * Perform encryption using ElGamal algorithm of message point M using randomness y
 * @param pubKey The public key to use for encryption.
 * @param m The message point to encrypt.
 * @param y The randomness to use for encryption.
 * @returns the cyphertext.
 */
export const elGamalEncrypt = (
    pubKey: PubKey, 
    m: Point, 
    y: BigInt
): Ciphertext[] => {
    const s = babyJub.mulPointEscalar(pubKey, y)
    const c1 = babyJub.mulPointEscalar(babyJub.Base8, y)

    const c2 = babyJub.addPoint(m, s)
    return [c1, c2]
}

/**
 * Performs decryption of the message point encrypted using ElGamal encryption algorithm
 * @param privKey The private key to use for decryption.
 * @param c1 The first component of the cyphertext.
 * @param c2 The second component of the cyphertext.
 * @returns the plain text.
 */
export const elGamalDecrypt = (
    privKey: PrivKey, 
    c1: Ciphertext, 
    c2: Ciphertext
): Point => {
    const s = babyJub.mulPointEscalar(c1, formatPrivKeyForBabyJub(privKey))
    const sInv = [SNARK_FIELD_SIZE - s[0], s[1]]
    const m = babyJub.addPoint(c2, sInv)
    return m;
}

/**
 * Maps bit to a point on the curve
 * @returns the point.
 */
const bitToCurve = (
    bit: BigInt
): Point => {
    switch(bit) {
        case BigInt(0):
            return [BigInt(0), BigInt(1)]
        case BigInt(1):
            return babyJub.Base8
        default: 
            throw new Error('Invalid bit value');
    }
}

/**
 * Maps curve point to bit
 * @returns the bit value.
 */
export const curveToBit = (
    p: Point
): bigint => {
    if (p[0] == BigInt(0) && p[1] == BigInt(1)) {
        return BigInt(0)
    } else if (p[0] == babyJub.Base8[0] && p[1] == babyJub.Base8[1]) {
        return BigInt(1)
    } else {
        throw new Error('Invalid point value')
    }
}

/** 
 * Perform encryption of a single bit using ElGamal algorithm using randomness y
 * @returns the cyphertext.
 */
export const elGamalEncryptBit = (
    pubKey: PubKey, 
    bit: BigInt, 
    y: BigInt,
): Ciphertext[] => {
    const m = bitToCurve(bit)
    return elGamalEncrypt(pubKey, m, y)
}

/**
 * Performs decryption of the message point encrypted bit using ElGamal encryption algorithm
 * @returns the decrypted bit.
 */
export const elGamalDecryptBit = (
    privKey: PrivKey, 
    c1: Ciphertext, 
    c2: Ciphertext
): bigint => {
    const m = elGamalDecrypt(privKey, c1, c2)
    return curveToBit(m)
}

/**
 * Performs re randomization of the cyphertext encrypted using ElGamal encryption algorithm
 * @param pubKey 
 * @param z 
 * @param c1 
 * @param c2 
 * @returns 
 */
export const elGamalRerandomize = (
    pubKey: PubKey,
    z: BigInt,
    c1: BigInt[],
    c2: BigInt[],
) => {
    // c1' = z*G + c1
    // c2' = pubKey * z + c2

    const c1r = babyJub.addPoint(
        babyJub.mulPointEscalar(babyJub.Base8, z),
        c1
    );

    const c2r = babyJub.addPoint(
        babyJub.mulPointEscalar(pubKey, z),
        c2
    );
    
    return [c1r, c2r];
}


export const babyJubAddPoint = (a: any, b: any) => babyJub.addPoint(a,b)
