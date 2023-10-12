import { decrypt, encrypt, genRandomSalt, hash4, hash9, sha256Hash, sign, stringifyBigInts, verifySignature } from "../../maci-crypto/src"
import assert from "node:assert"
import { PublicKey } from "./publicKey"
import { Ciphertext, EcdhSharedKey, Signature } from "../../maci-crypto/types/types"
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

/**
 * Unencrypted data whose fields include the user's public key, vote etc.
 */
export class KCommand extends Command {
	public newPubKey: PublicKey
	public newCreditBalance: bigint
	public nullifier: bigint
	public c1r: bigint[]
	public c2r: bigint[]
	public pollId: bigint
	public newStateIndex: bigint

	constructor(
		newPubKey: PublicKey,
		newCreditBalance: bigint,
		nullifier: bigint,
		c1r: bigint[],
		c2r: bigint[],
		pollId: bigint,
		newStateIndex: bigint = BigInt(0)
	) {
		super(BigInt(3))
		this.newPubKey = newPubKey
		this.newCreditBalance = newCreditBalance
		this.pollId = pollId
		this.nullifier = nullifier
		this.c1r = c1r
		this.c2r = c2r
		this.newStateIndex = newStateIndex ? newStateIndex : BigInt(0)
	}

	public setNewStateIndex(newStateIndex: bigint) {
		this.newStateIndex = newStateIndex
	}

	public copy = (): KCommand => {
		return new KCommand(
			this.newPubKey.copy(),
			BigInt(this.newCreditBalance.toString()),
			BigInt(this.nullifier.toString()),
			[BigInt(this.c1r[0].toString()), BigInt(this.c1r[1].toString())],
			[BigInt(this.c2r[0].toString()), BigInt(this.c2r[1].toString())],
			BigInt(this.pollId.toString()),
			BigInt(this.newStateIndex.toString()),
		)
	}

	public asArray = (): bigint[] => {		
		const a = [
			...this.newPubKey.asArray(), 
			this.newCreditBalance,
			this.nullifier,
			...this.c1r,
			...this.c2r,
			this.pollId,
		]
		assert(a.length === 9)
		return a
	}

	public asCircuitInputs = (): bigint[] => {
		return this.asArray();
	};

	/*
	 * Check whether this command has deep equivalence to another command
	 */
	public equals = (command: KCommand): boolean => {
		return (
            this.newPubKey.equals(command.newPubKey) &&
			this.newCreditBalance === command.newCreditBalance &&
			this.c1r[0] === command.c1r[0] &&
			this.c1r[1] === command.c1r[1] &&
			this.c2r[0] === command.c2r[0] &&
			this.c2r[1] === command.c2r[1] &&
			this.pollId === command.pollId
		);
	};

	public hash = (): bigint => {
		return hash9(this.asArray());
	};

	public encrypt = (
		sharedKey: EcdhSharedKey
	): Message => {
		const plaintext = [
			...this.asArray()
		]

		assert(plaintext.length === 9)

		const ciphertext: Ciphertext = encrypt(plaintext, sharedKey, BigInt(0))

		const message = new Message(BigInt(3), ciphertext)

		return message
	}

	/**
	 * Decrypts a Message to produce a Command.
	 */
	public static decrypt = (message: Message, sharedKey: EcdhSharedKey) => {
		const decrypted = decrypt(message.data, sharedKey, BigInt(0), 9)
		const newPubKey = new PublicKey([decrypted[0], decrypted[1]])
		const newCreditBalance = decrypted[2]
		const nullifier = decrypted[3]
		const c1r = [decrypted[4], decrypted[5]]
		const c2r = [decrypted[6], decrypted[7]]
		const pollId = decrypted[8]

		const command = new KCommand(
			newPubKey,
			newCreditBalance,
			nullifier,
			c1r,
			c2r,
			pollId,
		)

		return { command }
	}

	public prepareValues(
		deactivatedPrivateKey: PrivateKey,
		stateLeaves: StateLeaf[],
		stateTree: any,
        numSignUps: bigint,
        stateIndex: bigint,
        salt: bigint,
		coordinatorPubKey: PublicKey,
        deactivatedKeysTree: any,
		deactivatedKeyIndex: bigint,
		z: bigint,
		c1: bigint[],
		c2: bigint[],
	) {
		const stateTreeRoot = stateTree.root
		const deactivatedKeysRoot = deactivatedKeysTree.root
		
		const stateLeaf = stateLeaves[parseInt(stateIndex.toString())]
		const { voiceCreditBalance: oldCreditBalance, timestamp } = stateLeaf

		const stateTreeInclusionProof = stateTree.genMerklePath(Number(stateIndex)).pathElements
		const deactivatedKeysInclusionProof = deactivatedKeysTree.genMerklePath(parseInt(deactivatedKeyIndex.toString())).pathElements

		const ecdhKeypair = new Keypair()
		const sharedKey = Keypair.genEcdhSharedKey(
			ecdhKeypair.privKey,
			coordinatorPubKey,
		)

		const encryptedMessage = this.encrypt(sharedKey)
		const messageHash = sha256Hash(encryptedMessage.asContractParam().data.map((x:string) => BigInt(x)))

		const circuitInputs = stringifyBigInts({
			oldPrivKey: deactivatedPrivateKey.asCircuitInputs(),         
			newPubKey: this.newPubKey.asCircuitInputs(),
			numSignUps,
			stateIndex,
			salt,
			stateTreeRoot,
			deactivatedKeysRoot,
			stateTreeInclusionProof,
			oldCreditBalance,
			newCreditBalance: this.newCreditBalance, 
			stateLeafTimestamp: timestamp,
			deactivatedKeysInclusionProof: deactivatedKeysInclusionProof,
			deactivatedKeyIndex,
			c1,
			c2,
			coordinatorPubKey: coordinatorPubKey.asCircuitInputs(),
			encPrivKey: ecdhKeypair.privKey.asCircuitInputs(),
			c1r: this.c1r,
			c2r: this.c2r,
			z,
			nullifier: this.nullifier,
			pollId: this.pollId,
			inputHash: sha256Hash([
				stateTreeRoot,
				deactivatedKeysRoot,
				messageHash,
				...coordinatorPubKey.asCircuitInputs(),
				...ecdhKeypair.pubKey.asCircuitInputs(),
			]),
		})

		return { circuitInputs, encPubKey: ecdhKeypair.pubKey, message: encryptedMessage }
	}
}