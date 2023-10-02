import assert from "node:assert"
import { IncrementalQuinTree, genRandomSalt, hash5, hashLeftRight } from "../../crypto/src";

/**
 * A Ballot represents a User's votes in a Poll, as well as their next valid
 * nonce.
 * @param _voiceCreditBalance The user's voice credit balance
 * @param _nonce The number of valid commands which the user has already
 *               published
*/
export class Ballot {
   public votes: bigint[] = []
   public nonce: bigint = BigInt(0)
   public voteOptionTreeDepth: number

   constructor(_numVoteOptions: number, _voteOptionTreeDepth: number) {
       this.voteOptionTreeDepth = _voteOptionTreeDepth
       assert(5 ** _voteOptionTreeDepth >= _numVoteOptions)
       assert(_numVoteOptions >= 0)
       for (let i = 0; i < _numVoteOptions; i++) {
           this.votes.push(BigInt(0))
       }
   }

   public hash = (): BigInt => {
       const vals = this.asArray();
       return hashLeftRight(vals[0], vals[1]);
   };

   public asCircuitInputs = (): BigInt[] => {
       return this.asArray();
   };

   public asArray = (): bigint[] => {
       let lastIndexToInsert = this.votes.length - 1;
       while (lastIndexToInsert > 0) {
           if (this.votes[lastIndexToInsert] !== BigInt(0)) {
               break;
           }
           lastIndexToInsert--;
       }
       const voTree = new IncrementalQuinTree(
           this.voteOptionTreeDepth,
           BigInt(0),
           5,
           hash5
       );
       for (let i = 0; i <= lastIndexToInsert; i++) {
           voTree.insert(this.votes[i]);
       }

       return [this.nonce, voTree.root];
   };

   public copy = (): Ballot => {
       const b = new Ballot(this.votes.length, this.voteOptionTreeDepth);

       b.votes = this.votes.map((x) => BigInt(x.toString()));
       b.nonce = BigInt(this.nonce.toString());

       return b;
   };

   public equals(b: Ballot): boolean {
       for (let i = 0; i < this.votes.length; i++) {
           if (b.votes[i] !== this.votes[i]) {
               return false;
           }
       }
       return b.nonce === this.nonce && this.votes.length === b.votes.length;
   }

   public static genRandomBallot(
       _numVoteOptions: number,
       _voteOptionTreeDepth: number
   ) {
       const ballot = new Ballot(_numVoteOptions, _voteOptionTreeDepth);
       ballot.nonce = genRandomSalt();
       return ballot;
   }

   public static genBlankBallot(
       _numVoteOptions: number,
       _voteOptionTreeDepth: number
   ) {
       const ballot = new Ballot(_numVoteOptions, _voteOptionTreeDepth);
       return ballot;
   }
}
