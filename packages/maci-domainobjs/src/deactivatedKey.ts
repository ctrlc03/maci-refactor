import { genRandomSalt, hash3, hash5 } from "../../maci-crypto/src";
import { IDeactivatedKeyLeaf } from "../types";
import { Keypair } from "./keyPair";
import { PublicKey } from "./publicKey";

/**
 * @notice A leaf in the deactivated keys tree, 
 * containing hashed deactivated public key with deactivation status
 */
export class DeactivatedKeyLeaf implements IDeactivatedKeyLeaf {
    public pubKey: PublicKey
    public c1: bigint[]
    public c2: bigint[]
    public salt: bigint

    constructor (
        pubKey: PublicKey,
        c1: bigint[],
        c2: bigint[],
        salt: bigint
    ) {
        this.pubKey = pubKey
        this.c1 = c1
        this.c2 = c2
        this.salt = salt
    }

    /*
     * Deep-copies the object
     */
    public copy(): DeactivatedKeyLeaf {
        return new DeactivatedKeyLeaf(
            this.pubKey.copy(),
            [BigInt(this.c1[0].toString()), BigInt(this.c1[1].toString())],
            [BigInt(this.c2[0].toString()), BigInt(this.c2[1].toString())],
            BigInt(this.salt.toString()),
        )
    }

    public static genBlankLeaf(): DeactivatedKeyLeaf {
        // The public key for a blank state leaf is the first Pedersen base
        // point from iden3's circomlib implementation of the Pedersen hash.
        // Since it is generated using a hash-to-curve function, we are
        // confident that no-one knows the private key associated with this
        // public key. See:
        // https://github.com/iden3/circomlib/blob/d5ed1c3ce4ca137a6b3ca48bec4ac12c1b38957a/src/pedersen_printbases.js
        // Its hash should equal
        // 6769006970205099520508948723718471724660867171122235270773600567925038008762.
        return new DeactivatedKeyLeaf(
            new PublicKey([
                BigInt('10457101036533406547632367118273992217979173478358440826365724437999023779287'),
                BigInt('19824078218392094440610104313265183977899662750282163392862422243483260492317'),
            ]),
            [BigInt(0), BigInt(0)],
            [BigInt(0), BigInt(0)],
            BigInt(0)
        )
    }

    public static genRandomLeaf() {
        const keypair = new Keypair()
        return new DeactivatedKeyLeaf(
            keypair.pubKey,
            [BigInt(0), BigInt(0)],
            [BigInt(0), BigInt(0)],
            genRandomSalt()
        )
    }

    private asArray = (): bigint[] => {
        return [
            hash3([...this.pubKey.asArray(), this.salt]),
            ...this.c1,
            ...this.c2,
        ]
    }

    public asCircuitInputs = (): bigint[] => {
        return this.asArray()
    }

    public hash = (): bigint => {
        return hash5(this.asArray())
    }

    public asContractParam() {
        return {
            pubKeyHash: hash3([...this.pubKey.asArray(), this.salt]),
            c1: this.c1,
            c2: this.c2,
        }
    }

    public equals(s: DeactivatedKeyLeaf): boolean {
        return this.pubKey.equals(s.pubKey) &&
            this.c1[0] === s.c1[0] &&
            this.c1[0] === s.c1[1] &&
            this.c2[0] === s.c2[0] &&
            this.c2[0] === s.c2[1] &&
            this.salt === s.salt
    }

    public serialize = (): string => {
        const j = [
            this.pubKey.serialize(),
            this.c1[0].toString(16),
            this.c1[1].toString(16),
            this.c2[0].toString(16),
            this.c2[1].toString(16),
            this.salt.toString(16),
        ]

        return Buffer.from(JSON.stringify(j, null, 0), 'utf8').toString("base64url")
        
    }

    static unserialize = (serialized: string): DeactivatedKeyLeaf => {
        const j = JSON.parse(Buffer.from(serialized, "base64url").toString("utf8"))

        return new DeactivatedKeyLeaf(
            PublicKey.unserialize(j[0]),
            [BigInt('0x' + j[1]), BigInt('0x' + j[2])],
            [BigInt('0x' + j[3]), BigInt('0x' + j[4])],
            BigInt('0x' + j[5]),
        )
    }
}