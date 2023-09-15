// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SignUpGatekeeper } from './SignUpGatekeeper.sol';

/**
 * @title FreeForAllGatekeeper
 * @notice A gatekeeper that allows anyone to register
 */
contract FreeForAllGatekeeper is SignUpGatekeeper {

    function setMaciInstance(address _maci) public override {}

    /*
     * Registers the user without any restrictions.
     */
    function register(address, bytes memory) public override {}
}
