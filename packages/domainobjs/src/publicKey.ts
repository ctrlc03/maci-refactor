import assert from "node:assert"
import {
    PubKey as RawPubKey
} from "../../crypto/types/types"
import { SNARK_FIELD_SIZE, hashLeftRight, packPubKey, unpackPubKey } from "../../crypto/src";
import { SERIALIZED_PUB_KEY_PREFIX } from "./constants";

/**
 * @notice A class 
 */
export class PublicKey {
	public rawPubKey: RawPubKey

	constructor(rawPubKey: RawPubKey) {
		assert(rawPubKey.length === 2)
		assert(rawPubKey[0] < SNARK_FIELD_SIZE)
		assert(rawPubKey[1] < SNARK_FIELD_SIZE)
		this.rawPubKey = rawPubKey
	}

	public copy = (): PublicKey => {
		return new PublicKey([
			BigInt(this.rawPubKey[0].toString()),
			BigInt(this.rawPubKey[1].toString()),
		])
	}

	public asContractParam = () => {
		return {
			x: this.rawPubKey[0].toString(),
			y: this.rawPubKey[1].toString(),
		}
	}

	public asCircuitInputs = () => {
		return this.rawPubKey.map((x) => x.toString())
	}

	public asArray = (): bigint[] => {
		return [this.rawPubKey[0], this.rawPubKey[1]]
	}

	public serialize = (): string => {
		// Blank leaves have pubkey [0, 0], which packPubKey does not support
		if (
			BigInt(`${this.rawPubKey[0]}`) === BigInt(0) &&
			BigInt(`${this.rawPubKey[1]}`) === BigInt(0)
		) {
			return SERIALIZED_PUB_KEY_PREFIX + 'z'
		}
		const packed = packPubKey(this.rawPubKey).toString('hex')
		return SERIALIZED_PUB_KEY_PREFIX + packed.toString()
	}

	public hash = (): BigInt => {
		return hashLeftRight(this.rawPubKey[0], this.rawPubKey[1])
	}

	public equals = (p: PublicKey): boolean => {
		return (
			this.rawPubKey[0] === p.rawPubKey[0] &&
			this.rawPubKey[1] === p.rawPubKey[1]
		)
	}

	public static unserialize = (s: string): PublicKey => {
		// Blank leaves have pubkey [0, 0], which packPubKey does not support
		if (s === SERIALIZED_PUB_KEY_PREFIX + 'z') {
			return new PublicKey([BigInt(0), BigInt(0)])
		}

		const len = SERIALIZED_PUB_KEY_PREFIX.length;
		const packed = Buffer.from(s.slice(len), 'hex')
		return new PublicKey(unpackPubKey(packed))
	};

	public static isValidSerializedPubKey = (s: string): boolean => {
		const correctPrefix = s.startsWith(SERIALIZED_PUB_KEY_PREFIX)

		try {
			PublicKey.unserialize(s)
            return correctPrefix && true
		} catch {
            return false
		}
	}
}
