// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ISignUpToken } from "./interfaces/ISignUpToken.sol";

/**
 * @title SignUpTokenFactory
 * @author PSE
 * @notice SignUpTokenFactory is a contract that can be used to deploy new SignUpToken instances
 * using the Clones library
 */
contract SignUpTokenFactory {
    address immutable signUpTokenFactoryTemplate;

    event NewSignUpGatekeeperDeployed(address _signUpTokenFactoryTemplate);

    constructor(address _signUpTokenFactoryTemplate) payable {
        signUpTokenFactoryTemplate = _signUpTokenFactoryTemplate;
    }

    /**
     * @dev createNewInstance deploys a new SignUpToken instance using the Clones library
     * @return clone address
     */
    function createNewInstance(
        address _owner,
        string memory name,
        string memory symbol
    ) public returns (address clone) {
        // Deploy
        clone = Clones.clone(signUpTokenFactoryTemplate);

        ISignUpToken(clone).initialize(_owner, name, symbol);
   
        emit NewSignUpGatekeeperDeployed(clone);
    }
}