// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import { VkRegistry } from "../VkRegistry.sol";
import { AccQueue } from "../trees/AccQueue.sol";

/**
 * @title IMaci
 * @author PSE
 * @notice IMaci is the MACI's contract interface
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
    function initialize(
        address _owner,
        uint256 _pollFactory,
        uint256 _vkFactory,
        uint256 _signUpGatekeeperFactory,
        uint256 _accQueueFactory,
        uint256 _signUpPeriod,
        address _topupCredit
    ) external;
}
