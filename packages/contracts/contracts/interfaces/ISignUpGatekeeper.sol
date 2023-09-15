// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ISignUpGatekeeper
 * @author PSE
 * @notice ISignUpGatekeeper is an interface for the SignUpGatekeepers contracts
 */
interface ISignUpGatekeeper {
    function initialize(
        address,
        address,
        address
    ) external;
    function setMaciInstance(address) external;
    function register(address, bytes memory) external;
}
