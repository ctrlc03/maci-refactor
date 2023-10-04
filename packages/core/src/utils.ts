import { IncrementalQuinTree, hash5, hashLeftRight } from "../../crypto/src"

/**
* A helper function which hashes a list of results with a salt and returns the
* hash.
* @param results A list of vote weights
* @param salt A random salt
* @return The hash of the results and the salt, with the salt last
*/
export const genTallyResultCommitment = (
   results: bigint[],
   salt: bigint,
   depth: number,
): BigInt => {
    // create a new Quin Tree
    const tree = new IncrementalQuinTree(depth, BigInt(0), 5, hash5)
    // Fill with the results
    for (const result of results) tree.insert(result)
    // Hash the root 
    return hashLeftRight(tree.root, salt)
}

/**
 * Generate a signature for the Process VK
 * @param _stateTreeDepth 
 * @param _messageTreeDepth 
 * @param _voteOptionTreeDepth 
 * @param _batchSize 
 * @returns 
 */
export const genProcessVkSig = (
    _stateTreeDepth: number,
    _messageTreeDepth: number,
    _voteOptionTreeDepth: number,
    _batchSize: number
): bigint => {
    return (BigInt(_batchSize) << BigInt(192)) +
        (BigInt(_stateTreeDepth) << BigInt(128)) +
        (BigInt(_messageTreeDepth) << BigInt(64)) +
        BigInt(_voteOptionTreeDepth)
}

/**
 * Generate a signature for the Key Deactivation VK
 * @param _messageQueueSize 
 * @param _stateTreeDepth 
 * @returns 
 */
export const genDeactivationVkSig = (
    _messageQueueSize: number,
    _stateTreeDepth: number,
): bigint => {
    return (BigInt(_messageQueueSize) << BigInt(64)) +
        BigInt(_stateTreeDepth)
}

/**
 * Generate a signature for the Tally VK
 * @param _stateTreeDepth 
 * @param _intStateTreeDepth 
 * @param _voteOptionTreeDepth 
 * @returns the signature
 */
export const genTallyVkSig = (
    _stateTreeDepth: number,
    _intStateTreeDepth: number,
    _voteOptionTreeDepth: number,
): bigint => {
    return (BigInt(_stateTreeDepth) << BigInt(128)) +
        (BigInt(_intStateTreeDepth) << BigInt(64)) +
        BigInt(_voteOptionTreeDepth)
}

/**
 * Generate a signature for the Subsidy VK
 * @param _stateTreeDepth 
 * @param _intStateTreeDepth 
 * @param _voteOptionTreeDepth 
 * @returns 
 */
export const genSubsidyVkSig = (
    _stateTreeDepth: number,
    _intStateTreeDepth: number,
    _voteOptionTreeDepth: number,
): bigint => {
    return (BigInt(_stateTreeDepth) << BigInt(128)) +
        (BigInt(_intStateTreeDepth) << BigInt(64)) +
        BigInt(_voteOptionTreeDepth)
}

/**
 * Generate a signature for the key generation VK
 * @param _stateTreeDepth 
 * @param _messageTreeDepth 
 * @returns 
 */
export const genNewKeyGenerationVkSig = (
    _stateTreeDepth: number,
    _messageTreeDepth: number
): bigint => {
    return (BigInt(_stateTreeDepth) << BigInt(128)) +
        BigInt(_messageTreeDepth)
}