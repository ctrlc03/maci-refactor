import { SNARK_FIELD_SIZE, formatPrivKeyForBabyJub } from "../../maci-crypto/src";
import {
    PrivKey as RawPrivKey,
} from "../../maci-crypto/types/types"
import { SERIALIZED_PRIV_KEY_PREFIX } from "./constants";

/**
 * @notice PrivKey is a TS Class representing a MACI PrivateKey (on the jubjub curve)
 */
export class PrivateKey {
	public rawPrivKey: RawPrivKey

	constructor(rawPrivKey: RawPrivKey) {
		this.rawPrivKey = rawPrivKey
	}

	public copy = (): PrivateKey => {
		return new PrivateKey(BigInt(this.rawPrivKey.toString()))
	}

	public asCircuitInputs = () => {
		return formatPrivKeyForBabyJub(this.rawPrivKey).toString()
	}

	public serialize = (): string => {
		return SERIALIZED_PRIV_KEY_PREFIX + this.rawPrivKey.toString(16)
	}

	public static unserialize = (s: string): PrivateKey => {
		const x = s.slice(SERIALIZED_PRIV_KEY_PREFIX.length)
		return new PrivateKey(BigInt('0x' + x))
	}

	public static isValidSerializedPrivKey = (s: string): boolean => {
		const correctPrefix = s.startsWith(SERIALIZED_PRIV_KEY_PREFIX)
		const x = s.slice(SERIALIZED_PRIV_KEY_PREFIX.length)

		let validValue = false
		try {
			const value = BigInt('0x' + x)
			validValue = value < SNARK_FIELD_SIZE
		} catch {
			// comment to make linter happy
		}

		return correctPrefix && validValue
	}
}
