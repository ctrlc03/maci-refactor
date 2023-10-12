// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { VkRegistry } from "../VkRegistry.sol";
import { AccQueue } from "../trees/AccQueue.sol";

/**
 * @title IOwned
 * @author PSE
 * @notice IOwned is a wrapper for contracts that implement Owned
 */
interface IOwned {
    function transferOwnership(address _owner) external;
}
