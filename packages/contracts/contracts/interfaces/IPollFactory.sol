// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPollFactory
 * @author PSE
 * @notice IPollFactory is an interface for the PollFactory contract
 */
interface IPollFactory {
    function createNewInstance(address _owner) external;
}
