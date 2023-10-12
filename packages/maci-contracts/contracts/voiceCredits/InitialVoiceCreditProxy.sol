// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InitialVoiceCreditProxy
 * @author PSE
 * @notice An abstract contract for the InitialVoiceCreditProxy implementations
 */
abstract contract InitialVoiceCreditProxy {
    function getVoiceCredits(address _user, bytes memory _data) public virtual view returns (uint256) {}
}
