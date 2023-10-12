// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import { InitialVoiceCreditProxy } from "./InitialVoiceCreditProxy.sol";

/**
 * @title ConstantInitialVoiceCreditProxy
 * @notice A contract that implements InitialVoiceCreditProxy and returns a constant value
 */
contract ConstantInitialVoiceCreditProxy is InitialVoiceCreditProxy {

    // the balance of the contract
    uint256 internal balance;

    /**
     * In the constructor we set the balance of the contract
     * @param _balance The balance of the contract
     */
    constructor(uint256 _balance) payable {
        balance = _balance;
    }

    /**
     * @dev getVoiceCredits returns the balance of the contract
     */
    function getVoiceCredits(address, bytes memory) public override view returns (uint256) {
        return balance;
    }
}
