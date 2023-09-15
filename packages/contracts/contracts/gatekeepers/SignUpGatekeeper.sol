// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SignUpGatekeeper
 * @author PSE
 * @notice An abstract contract for MACI gatekeepers
 * Use this to implement your own gatekeeper
 */
abstract contract SignUpGatekeeper {
    function setMaciInstance(address _maci) public virtual {}
    function register(address _user, bytes memory _data) public virtual {}
}
