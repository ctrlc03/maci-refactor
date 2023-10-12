// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IVkRegistryFactory
 * @author PSE
 * @notice IVkRegistryFactory is an interface for the VkRegistryFactory contract
 */
interface IVkRegistryFactory {
    function createNewInstance(address _owner) external returns (address clone);
}
