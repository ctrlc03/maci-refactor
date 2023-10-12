import assert from "node:assert"
import { genEcdhSharedKey, genKeypair, genPubKey } from "../../maci-crypto/src";
import { PrivateKey } from "./privateKey";
import { PublicKey } from "./publicKey";

/**
 * @notice A KeyPair is a pair of public and private keys
 * @author PSE 
 */
export class Keypair {
	public privKey: PrivateKey
	public pubKey: PublicKey

	constructor(privKey?: PrivateKey) {
		if (privKey) {
			this.privKey = privKey
			this.pubKey = new PublicKey(genPubKey(privKey.rawPrivKey))
		} else {
			const rawKeyPair = genKeypair()
			this.privKey = new PrivateKey(rawKeyPair.privKey)
			this.pubKey = new PublicKey(rawKeyPair.pubKey)
		}
	}

	public copy = (): Keypair => {
		return new Keypair(this.privKey.copy())
	}

	public static genEcdhSharedKey(privKey: PrivateKey, pubKey: PublicKey) {
		return genEcdhSharedKey(privKey.rawPrivKey, pubKey.rawPubKey)
	}

	public equals(keypair: Keypair): boolean {
		const equalPrivKey = this.privKey.rawPrivKey === keypair.privKey.rawPrivKey
		const equalPubKey =
			this.pubKey.rawPubKey[0] === keypair.pubKey.rawPubKey[0] &&
			this.pubKey.rawPubKey[1] === keypair.pubKey.rawPubKey[1]

		// If this assertion fails, something is very wrong and this function
		// should not return anything
		// XOR is equivalent to: (x && !y) || (!x && y )
		const x = equalPrivKey && equalPubKey
		const y = !equalPrivKey && !equalPubKey

		assert((x && !y) || (!x && y))

		return equalPrivKey
	}
}
