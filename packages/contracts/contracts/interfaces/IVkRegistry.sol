// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SnarkCommon } from "../crypto/SnarkCommon.sol";

/**
 * @title IVkRegistry
 * @author PSE
 * @notice IVkRegistry is an interface for the VkRegistry contract
 */
interface IVkRegistry {
    function isProcessVkSet(uint256 _sig) external view returns (bool);
    function initialize(address _owner) external;
    function setVerifyingKeys(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _messageTreeDepth,
        uint256 _voteOptionTreeDepth,
        uint256 _messageBatchSize,
        SnarkCommon.VerifyingKey memory _processVk,
        SnarkCommon.VerifyingKey memory _deactivationVk,
        SnarkCommon.VerifyingKey memory _tallyVk,
        SnarkCommon.VerifyingKey memory _newKeyGenerationVk
    ) external;
    function setSubsidyKeys(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth,
        SnarkCommon.VerifyingKey memory _subsidyVk
    ) external;
    function getnewKeyGenerationVkBySig(uint256 _sig) external view returns (SnarkCommon.VerifyingKey memory);
    function getNewKeyGenerationVk(uint256 _stateTreeDepth, uint256 _messageTreeDepth) external view returns (SnarkCommon.VerifyingKey memory);
    function hasSubsidyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) external view returns (bool);
    function getSubsidyVkBySig(uint256 _sig) external view returns (SnarkCommon.VerifyingKey memory);
    function getSubsidyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) external view returns (SnarkCommon.VerifyingKey memory);
}
