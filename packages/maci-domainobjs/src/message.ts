import assert from "node:assert"
import { PublicKey } from "./publicKey";
import { hash13 } from "../../maci-crypto/src";

/**
 * @title Message
 * @notice An encrypted command and signature.
 * @author PSE 
 */
export class Message {
	public msgType: bigint
	public data: bigint[]
	public static DATA_LENGTH = 10

	constructor(msgType: bigint, data: bigint[]) {
		assert(data.length === Message.DATA_LENGTH)
		this.msgType = msgType
		this.data = data
	}

	private asArray = (): bigint[] => {
		return [this.msgType].concat(this.data)
	}

	public asContractParam = () => {
		return {
			msgType: this.msgType,
			data: this.data.map((x: bigint) => x.toString()),
		}
	}

	public asCircuitInputs = (): bigint[] => {
		return this.asArray()
	}

	public hash = (_encPubKey: PublicKey): bigint => {
		return hash13([...[this.msgType], ...this.data, ..._encPubKey.rawPubKey])
	}

	public copy = (): Message => {
		return new Message(
			BigInt(this.msgType.toString()),
			this.data.map((x: bigint) => BigInt(x.toString()))
		)
	}

	public equals = (m: Message): boolean => {
		if (this.data.length !== m.data.length) {
			return false
		}
		if (this.msgType !== m.msgType) {
			return false
		}

		for (let i = 0; i < this.data.length; i++) {
			if (this.data[i] !== m.data[i]) {
				return false
			}
		}

		return true
	}
}