import {
    Keypair
} from "../../../domainobjs/src"
import { banner } from "../utils/banner"

/**
 * Generate a new Maci Key Pair
 */
export const genKeyPair = () => {
    banner()
    const keypair = new Keypair()

    const serializedPubKey = keypair.pubKey.serialize()
    const serializedPrivKey = keypair.privKey.serialize()

    // @todo can later look into nice printing/formatting
    console.log(`Public key: ${serializedPubKey}`)
    console.log(`Private key: ${serializedPrivKey}`)
}
