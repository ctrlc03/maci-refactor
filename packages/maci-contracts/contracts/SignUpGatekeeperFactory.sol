// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ISignUpGatekeeper } from "./interfaces/ISignUpGatekeeper.sol";

/**
 * @title SignUpGatekeeperFactory
 * @author PSE
 * @notice SignUpGatekeeperFactory is a contract that can be used to deploy new SignUpGatekeeper instances
 * using the Clones library
 */
contract SignUpGatekeeperFactory {
    address immutable signUpGatekeeperInstanceTemplate;

    event NewSignUpTokenDeployed(address _signUpGatekeeperInstance);

    constructor(address _signUpGatekeeperInstanceTemplate) payable {
        signUpGatekeeperInstanceTemplate = _signUpGatekeeperInstanceTemplate;
    }

    /**
     * @dev createNewInstance deploys a new SignUpGatekeeper instance using the Clones library
     * @param _owner The owner of the contract
     * @param _tokenAddress The address of the token contract
     * @param _maciAddress The address of the MACI contract
     * @return clone address
     */
    function createNewInstance(
        address _owner,
        address _tokenAddress,
        address _maciAddress
    ) public returns (address clone) {
        // Deploy
        clone = Clones.clone(signUpGatekeeperInstanceTemplate);

        // init
        ISignUpGatekeeper(clone).initialize(_owner, _tokenAddress, _maciAddress);
   
        // emit event with address
        emit NewSignUpTokenDeployed(clone);
    }
}