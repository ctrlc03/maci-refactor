// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IOwned } from "./interfaces/IOwned.sol";

/**
 * @title VkRegistryFactory
 * @author PSE
 * @notice VkRegistryFactory is a contract that can be used to deploy new VkRegistry instances
 * using the Clones library
 */
contract VkRegistryFactory {
    address immutable vkRegistryTemplate;

    event NewVkRegistryDeployed(address _vkRegistry);

    constructor(address _vkRegistryTemplate) payable {
        vkRegistryTemplate = _vkRegistryTemplate;
    }

    /**
     * @dev createNewInstance deploys a new VkRegistry instance using the Clones library
     * @return clone address
     */
    function createNewInstance() public returns (address clone) {
        // Deploy
        clone = Clones.clone(vkRegistryTemplate);
   
        emit NewVkRegistryDeployed(clone);
    }
}