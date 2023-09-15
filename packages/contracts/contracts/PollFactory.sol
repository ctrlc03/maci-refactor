// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;

// import { PollDeploymentParams } from "./Utils.sol";
// import { AccQueueQuinaryMaci } from "./trees/AccQueue.sol";
// import { Poll } from "./Poll.sol";
// import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";

// /**
//  * @title PollFactory
//  * A factory contract which deploys Poll contracts.
//  */
// // contract PollFactory is Params, IPubKey, Ownable, PollDeploymentParams {
// //     /** 
// //      * @dev Deploy a new Poll contract and AccQueue contract for messages.
// //      * @param _messageProcessorAddress The address of the MessageProcessor
// //      * contract.
// //      * @param _duration The duration of the poll, in seconds.
// //      * @param _maxValues The maximum number of messages and vote options.
// //      * @param _treeDepths The depths of the message and vote option Merkle
// //      * trees.
// //      * @param _batchSizes The sizes of the message and vote option batches.
// //      * @param _coordinatorPubKey The coordinator's public key.
// //      * @param _vkRegistry The address of the VerifyingKeyRegistry contract.
// //      * @param _maci The address of the MACI contract.
// //      * @param _topupCredit The address of the TopupCredit contract.
// //      * @param _pollOwner The address of the owner of the Poll contract.
// //      */
// //     function deploy(
// //         address _messageProcessorAddress,
// //         uint256 _duration,
// //         MaxValues memory _maxValues,
// //         TreeDepths memory _treeDepths,
// //         BatchSizes memory _batchSizes,
// //         PubKey memory _coordinatorPubKey,
// //         VkRegistry _vkRegistry,
// //         IMACI _maci,
// //         TopupCredit _topupCredit,
// //         address _pollOwner
// //     ) public onlyOwner returns (Poll) {
// //         uint256 treeArity = 5;

// //         // Deploy the message accQueue
// //         AccQueue messageAq = new AccQueueQuinaryMaci(
// //             _treeDepths.messageTreeSubDepth
// //         );

// //         // Deploy the deactivated messages accQueue
// //         AccQueue deactivatedKeysAq = new AccQueueQuinaryMaci(
// //             _treeDepths.messageTreeSubDepth
// //         );

// //         ExtContracts memory extContracts;

// //         // @todo remove _vkRegistry; only PollProcessorAndTallyer needs it
// //         extContracts.vkRegistry = _vkRegistry;
// //         extContracts.maci = _maci;
// //         extContracts.messageAq = messageAq;
// //         extContracts.deactivatedKeysAq = deactivatedKeysAq;
// //         extContracts.topupCredit = _topupCredit;

// //         Poll poll = new Poll(
// //             _messageProcessorAddress,
// //             _duration,
// //             _maxValues,
// //             _treeDepths,
// //             _batchSizes,
// //             _coordinatorPubKey,
// //             extContracts
// //         );

// //         // Make the Poll contract own the messageAq contract, so only it can
// //         // run enqueue/merge
// //         messageAq.transferOwnership(address(poll));

// //         // Make the MessageProcessor contract own the deactivatedKeysAq contract, so only it can
// //         // run enqueue/merge
// //         // @todo check for stack too deep 
// //         {
// //             deactivatedKeysAq.transferOwnership(_messageProcessorAddress);
// //         }

// //         // init messageAq
// //         poll.init();

// //         // @todo should this be _maci.owner() instead?
// //         poll.transferOwnership(_pollOwner);

// //         return poll;
// //     }
// // }

contract PollFactory {
    
}