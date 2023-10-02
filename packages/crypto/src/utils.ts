import * as ff from 'ffjavascript'

export const stringifyBigInts: (obj: object) => any = ff.utils.stringifyBigInts
export const unstringifyBigInts: (obj: object) => any = ff.utils.unstringifyBigInts

/**
 * Convert a BigInt to a Buffer
 */
export const bigInt2Buffer = (i: bigint): Buffer => {
    return Buffer.from(i.toString(16), 'hex')
}