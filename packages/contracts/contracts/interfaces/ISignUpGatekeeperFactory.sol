// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ISignUpGatekeeperFactory
 * @author PSE
 * @notice ISignUpGatekeeperFactory is an interface for the SignUpGatekeeperFactory contract
 */
interface ISignUpGatekeeperFactory {
    function createNewInstance(address _owner, address _token, address _maci) external returns (address clone);
}
