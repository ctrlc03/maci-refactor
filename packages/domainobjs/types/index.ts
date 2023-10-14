import { G1Point, G2Point } from "../../crypto/src";
import { PublicKey } from "../src/publicKey";

/**
 * @notice An interface representing a zk-SNARK proof
 */
export interface Proof {
	a: G1Point;
	b: G2Point;
	c: G1Point;
}

/**
 * @notice An interface representing a MACI state lead
 */
export interface IStateLeaf {
	pubKey: PublicKey;
	voiceCreditBalance: bigint;
}

/**
 * @notice An interface representing a MACI deactivated key leaf
 */
export interface IDeactivatedKeyLeaf {
    pubKey: PublicKey;
    c1: bigint[];
    c2: bigint[];
    salt: bigint;
}

/**
 * @notice An interface representing a MACI vote option leaf 
 */
export interface VoteOptionTreeLeaf {
	votes: bigint;
}