import { genPubKey } from "../../../crypto/src"
import { PrivateKey, PublicKey } from "../../../maci-domainobjs/src"
import { banner } from "../utils/banner"

/**
 * Generate a new Maci Public key from a private key
 * @param opt - the options, in this case the private key
 */
export const genMaciPubKey = (opt: any) => {
    banner()
    const key = opt.privkey 

    if (!PrivateKey.isValidSerializedPrivKey(key)) {
        console.log("Error, invalid private key")
        process.exit(1)
    }

    const unserializedKey = PrivateKey.unserialize(key)
    const pubKey = new PublicKey(genPubKey(unserializedKey.rawPrivKey))

    console.log(`Public key: ${pubKey.serialize()}`)
}