// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import { VkRegistry } from "../VkRegistry.sol";
import { AccQueue } from "../trees/AccQueue.sol";

/**
 * @title IMACI
 * @author PSE
 * @notice IMACI is the MACI's contract interface
 */
interface IMaci {
    function stateTreeDepth() external view returns (uint8);
    function vkRegistry() external view returns (VkRegistry);
    function getStateAqRoot() external view returns (uint256);
    function mergeStateAqSubRoots(uint256 _numSrQueueOps, uint256 _pollId) external;
    function mergeStateAq(uint256 _pollId) external returns (uint256);
    function numSignUps() external view returns (uint256);
    function stateAq() external view returns (AccQueue);
    function signUpDeadline() external view returns (uint40);
    function deactivationPeriod() external view returns (uint40);
    function initialize(
        address _messageProcessorAddress,
        uint256 _duration,
        uint256 _maxValues,
        uint256 _treeDepths,
        uint256 _batchSizes,
        uint256 _coordinatorPubKey,
        address _vkRegistry,
        address _maci,
        address _topupCredit,
        address _pollOwner
    ) external;
}
