// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Owned } from "solmate/src/auth/Owned.sol";
import { IVerifier } from "./interfaces/IVerifier.sol";

/**
 * @title MessageProcessor
 * @author PSE
 * @notice MessageProcessor is used to process messages published by signup users
 *         it will process messages in batches. After processing, 
 *         the sbCommitment will be used for the Tally and the Subsidy contracts
 */
contract MessageProcessor is Owned {

    bool public isInitialized;

    IVerifier public verifier;

    error AlreadyInitialized();


    constructor() payable Owned(msg.sender) {}

    function initialize(address _owner, address _verifier) external {
        if (isInitialized) revert AlreadyInitialized();
        isInitialized = true;

        owner = _owner;

        verifier = IVerifier(_verifier);
    }
}