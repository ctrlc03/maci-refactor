import { StateLeaf } from "../../domainobjs/src"

export const DEACT_MESSAGE_INIT_HASH = BigInt('8370432830353022751713833565135785980866757267633941821328460903436894336785')
export const STATE_TREE_DEPTH = 10
export const DEACT_KEYS_TREE_DEPTH = 10
export const blankStateLeaf = StateLeaf.genBlankLeaf()
export const blankStateLeafHash = blankStateLeaf.hash()