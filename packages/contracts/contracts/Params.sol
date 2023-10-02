// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IVkRegistry } from "./interfaces/IVkRegistry.sol";
import { IMaci } from "./interfaces/IMaci.sol";
import { IAccQueue } from "./interfaces/IAccQueue.sol";
import { ITopupCredit } from "./interfaces/ITopupCredit.sol";

/**
 * @title Params
 * @author PSE
 * @notice This contract holds a number of struct needed for the other contracts
 */
contract Params {
    // This structs help to reduce the number of parameters to the constructor
    // and avoid a stack overflow error during compilation
    struct TreeDepths {
        uint8 intStateTreeDepth;
        uint8 messageTreeSubDepth;
        uint8 messageTreeDepth;
        uint8 voteOptionTreeDepth;
    }

    struct BatchSizes {
        uint24 messageBatchSize;
        uint24 tallyBatchSize;
        uint24 subsidyBatchSize;
    }

    struct MaxValues {
        uint256 maxMessages;
        uint256 maxVoteOptions;
    }

    struct ExtContracts {
        IVkRegistry vkRegistry;
        IMaci maci;
        IAccQueue messageAq;
        IAccQueue deactivatedKeysAq;
        ITopupCredit topupCredit;
    }
}