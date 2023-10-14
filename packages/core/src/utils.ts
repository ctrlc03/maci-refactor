import assert from "node:assert"
import { IncrementalQuinTree, hash5, hashLeftRight } from "../../crypto/src"

/**
* A helper function which hashes a list of results with a salt and returns the
* hash.
* @param results A list of vote weights
* @param salt A random salt
* @returns The hash of the results and the salt, with the salt last
*/
export const genTallyResultCommitment = (
   results: bigint[],
   salt: bigint,
   depth: number,
): bigint => {
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

/**
 * Pack the subsidy small values
 * @param row 
 * @param col 
 * @param numSignUps 
 * @returns The packed values
 */
export const packSubsidySmallVals = (
    row: number,
    col: number,
    numSignUps: number,
): bigint => {
    // Note: the << operator has lower precedence than +
    const packedVals =
        (BigInt(numSignUps) << BigInt(100)) +
        (BigInt(row) << BigInt(50)) +
        BigInt(col)
    return packedVals
}

/**
 * Pack the Tally Votes values
 * @param batchStartIndex 
 * @param batchSize 
 * @param numSignUps 
 * @returns The packed values
 */
export const packTallyVotesSmallVals = (
    batchStartIndex: number,
    batchSize: number,
    numSignUps: number,
): bigint => {
    // Note: the << operator has lower precedence than +
    const packedVals =
        (BigInt(batchStartIndex) / BigInt(batchSize)) +
        (BigInt(numSignUps) << BigInt(50))

    return packedVals
}

/**
 * Unpack the previously packed tally values
 * @param packedVals The packed values
 * @returns The unpacked values
 */
export const unpackTallyVotesSmallVals = (
    packedVals: bigint,
): any => {
    let asBin = packedVals.toString(2)
    assert(asBin.length <= 100)
    while (asBin.length < 100) {
        asBin = '0' + asBin
    }
    const numSignUps = BigInt('0b' + asBin.slice(0, 50))
    const batchStartIndex = BigInt('0b' + asBin.slice(50, 100))

    return { numSignUps, batchStartIndex }
}

/**
 * Pack process messages values
 * @param maxVoteOptions 
 * @param numUsers 
 * @param batchStartIndex 
 * @param batchEndIndex 
 * @returns 
 */
export const packProcessMessageSmallVals = (
    maxVoteOptions: bigint,
    numUsers: bigint,
    batchStartIndex: number,
    batchEndIndex: number,
): bigint => {
    return BigInt(`${maxVoteOptions}`) +
        (BigInt(`${numUsers}`) << BigInt(50)) +
        (BigInt(batchStartIndex) << BigInt(100)) +
        (BigInt(batchEndIndex) << BigInt(150))
}

/**
 * Unpack previously packed process message values
 * @param packedVals The packed values
 * @returns The unpacked values
 */
export const unpackProcessMessageSmallVals = (
    packedVals: bigint,
) => {
    let asBin = (packedVals).toString(2)
    assert(asBin.length <= 200)
    while (asBin.length < 200) {
        asBin = '0' + asBin
    }
    const maxVoteOptions = BigInt('0b' + asBin.slice(150, 200))
    const numUsers = BigInt('0b' + asBin.slice(100, 150))
    const batchStartIndex = BigInt('0b' + asBin.slice(50, 100))
    const batchEndIndex = BigInt('0b' + asBin.slice(0, 50))

    return {
        maxVoteOptions,
        numUsers,
        batchStartIndex,
        batchEndIndex,
    }
}