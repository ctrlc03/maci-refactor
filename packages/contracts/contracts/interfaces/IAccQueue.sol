// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAccQueue
 * @author PSE
 * @notice IAccQueue is an interface for the AccQueue contracts
 */
interface IAccQueue {
    function initialize(uint256 _subDepth, uint256 _hashLength, address _owner) external;
    function getMainRoot(uint256 _stateTreeDepth) external view returns (uint256);
    function mergeSubRoots(uint256 _numSrQueueOps) external;
    function merge(uint256 _stateTreeDepth) external returns (uint256);
    function treeMerged() external returns (bool);
}
