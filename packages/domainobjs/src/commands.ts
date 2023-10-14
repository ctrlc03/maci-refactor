import { decrypt, encrypt, genRandomSalt, hash4, hash9, sha256Hash, sign, stringifyBigInts, verifySignature } from "../../crypto/src"
import assert from "node:assert"
import { PublicKey } from "./publicKey"
import { Ciphertext, EcdhSharedKey, Signature } from "../../crypto/types/types"
import { PrivateKey } from "./privateKey"
import { Message } from "./message"
import { StateLeaf } from "./stateLeaf"
import { Keypair } from "./keyPair"

/**
 * @notice Base class for Commands
 */
export class Command {
	public cmdType: bigint

	constructor(cmdType: bigint) {
        this.cmdType = cmdType
    }

	public copy(): Command { return this }
	public equals(command: Command) {}
}

/**
 * @notice Command for submitting a vote
 */
export class TCommand extends Command {
	public stateIndex: bigint
	public amount: bigint
	public pollId: bigint

	constructor(stateIndex: bigint, amount: bigint, pollId: bigint) {
		super(BigInt(2));
		this.stateIndex = stateIndex
		this.amount = amount
        this.pollId = pollId
	}

	public copy = (): TCommand => {
		return new TCommand(
			this.stateIndex,
			this.amount,
            this.pollId
		) 
	}

	public equals = <T extends TCommand>(command: T): boolean => {
		return (
			this.stateIndex === command.stateIndex && this.amount === command.amount
            && this.pollId === command.pollId && this.cmdType === command.cmdType
		)
	}
}

/**
 * @notice Unencrypted data whose fields include the user's public key, vote etc.
 */
export class PCommand extends Command {
	public stateIndex: bigint
	public newPubKey: PublicKey;
	public voteOptionIndex: bigint
	public newVoteWeight: bigint
	public nonce: bigint
	public pollId: bigint
	public salt: bigint

	constructor(
		stateIndex: bigint,
		newPubKey: PublicKey,
		voteOptionIndex: bigint,
		newVoteWeight: bigint,
		nonce: bigint,
		pollId: bigint,
		salt: bigint = genRandomSalt()
	) {
		super(BigInt(1));
		const limit50Bits = BigInt(2 ** 50)
		assert(limit50Bits >= stateIndex)
		assert(limit50Bits >= voteOptionIndex)
		assert(limit50Bits >= newVoteWeight)
		assert(limit50Bits >= nonce)
		assert(limit50Bits >= pollId)

		this.stateIndex = stateIndex
		this.newPubKey = newPubKey
		this.voteOptionIndex = voteOptionIndex
		this.newVoteWeight = newVoteWeight
		this.nonce = nonce
		this.pollId = pollId
		this.salt = salt
	}

	public copy = (): PCommand => {
		return new PCommand(
			BigInt(this.stateIndex.toString()),
			this.newPubKey.copy(),
			BigInt(this.voteOptionIndex.toString()),
			BigInt(this.newVoteWeight.toString()),
			BigInt(this.nonce.toString()),
			BigInt(this.pollId.toString()),
			BigInt(this.salt.toString())
		)
	}

	/**
	 * @notice Returns this Command as an array. Note that 5 of the Command's fields
	 * are packed into a single 250-bit value. This allows Messages to be
	 * smaller and thereby save gas when the user publishes a message.
     * @returns bigint[] - the command as an array 
	 */
	public asArray = (): bigint[] => {
		const p =
			BigInt(`${this.stateIndex}`) +
			(BigInt(`${this.voteOptionIndex}`) << BigInt(50)) +
			(BigInt(`${this.newVoteWeight}`) << BigInt(100)) +
			(BigInt(`${this.nonce}`) << BigInt(150)) +
			(BigInt(`${this.pollId}`) << BigInt(200))

		const a = [p, ...this.newPubKey.asArray(), this.salt]
		assert(a.length === 4)
		return a
	};

	public asCircuitInputs = (): bigint[] => {
		return this.asArray()
	};

	/*
	 * Check whether this command has deep equivalence to another command
	 */
	public equals = (command: PCommand): boolean => {
		return (
			this.stateIndex === command.stateIndex &&
            this.newPubKey.equals(command.newPubKey) &&
			this.voteOptionIndex === command.voteOptionIndex &&
			this.newVoteWeight === command.newVoteWeight &&
			this.nonce === command.nonce &&
			this.pollId === command.pollId &&
			this.salt === command.salt
		)
	}

	public hash = (): bigint => {
		return hash4(this.asArray())
	}

	/**
	 * @notice Signs this command and returns a Signature.
	 */
	public sign = (privKey: PrivateKey): Signature => {
		return sign(privKey.rawPrivKey, this.hash())
	}

	/**
	 * @notice Returns true if the given signature is a correct signature of this
	 * command and signed by the private key associated with the given public
	 * key.
	 */
	public verifySignature = (signature: Signature, pubKey: PublicKey): boolean => {
		return verifySignature(this.hash(), signature, pubKey.rawPubKey);
	};

	/**
	 * @notice Encrypts this command along with a signature to produce a Message.
	 * To save gas, we can constrain the following values to 50 bits and pack
	 * them into a 250-bit value:
	 * 0. state index
	 * 3. vote option index
	 * 4. new vote weight
	 * 5. nonce
	 * 6. poll ID
	 */
	public encrypt = (
		signature: Signature,
		sharedKey: EcdhSharedKey
	): Message => {
		const plaintext = [
			...this.asArray(),
			signature.R8[0],
			signature.R8[1],
			signature.S,
		]

		assert(plaintext.length === 7)

		const ciphertext: Ciphertext = encrypt(plaintext, sharedKey, BigInt(0))

		const message = new Message(BigInt(1), ciphertext)

		return message
	};

	/**
	 * Decrypts a Message to produce a Command.
     * @param {Message} message - the message to decrypt
     * @param {EcdhSharedKey} sharedKey - the shared key to use for decryption
	 */
	public static decrypt = (message: Message, sharedKey: EcdhSharedKey) => {
		const decrypted = decrypt(message.data, sharedKey, BigInt(0), 7)

		const p = BigInt(`${decrypted[0]}`)

		// Returns the value of the 50 bits at position `pos` in `val`
		// create 50 '1' bits
		// shift left by pos
		// AND with val
		// shift right by pos
		const extract = (val: bigint, pos: number): bigint => {
			return (
				BigInt(
					(((BigInt(1) << BigInt(50)) - BigInt(1)) << BigInt(pos)) &
						BigInt(`${val}`)
				) >> BigInt(pos)
			)
		}

		// p is a packed value
		// bits 0 - 50:    stateIndex
		// bits 51 - 100:  voteOptionIndex
		// bits 101 - 150: newVoteWeight
		// bits 151 - 200: nonce
		// bits 201 - 250: pollId
		const stateIndex = extract(p, 0);
		const voteOptionIndex = extract(p, 50);
		const newVoteWeight = extract(p, 100);
		const nonce = extract(p, 150);
		const pollId = extract(p, 200);

		const newPubKey = new PublicKey([decrypted[1], decrypted[2]]);
		const salt = decrypted[3];

		const command = new PCommand(
			stateIndex,
			newPubKey,
			voteOptionIndex,
			newVoteWeight,
			nonce,
			pollId,
			salt
		);

		const signature = {
			R8: [decrypted[4], decrypted[5]],
			S: decrypted[6],
		};

		return { command, signature };
	};
}