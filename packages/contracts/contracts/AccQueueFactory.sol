// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IOwned } from "./interfaces/IOwned.sol";
import { IAccQueue } from "./interfaces/IAccQueue.sol";

/**
 * @title AccQueueFactory
 * @author PSE
 * @notice AccQueueFactory is a contract that can be used to deploy new AccQueue instances
 * using the Clones library
 */
contract AccQueueFactory {

    /// @notice store the templates as immutable variables
    address immutable public accQueueBinary0Template;
    address immutable public accQueueBinaryMaciTemplate;
    address immutable public accQueueQuinary0Template;
    address immutable public accQueueQuinaryMaciTemplate;
    address immutable public accQueueQuinaryBlankSlTemplate;

    /// @notice the events to differentiate between which contracts are deployed
    event NewAccQueueBinary0Deployed(address _accQueue);
    event NewAccQueueBinaryMaciDeployed(address _accQueue);
    event NewAccQueueQuinary0Deployed(address _accQueue);
    event NewAccQueueQuinaryMaciDeployed(address _accQueue);
    event NewAccQueueQuinaryBlankSlDeployed(address _accQueue);

    /**
     * @notice the constructor sets the templates
     * @param _accQueueBinary0Template The address of the AccQueueBinary0 template
     * @param _accQueueBinaryMaciTemplate The address of the AccQueueBinaryMaci template
     * @param _accQueueQuinary0Template The address of the AccQueueQuinary0 template
     * @param _accQueueQuinaryMaciTemplate The address of the AccQueueQuinaryMaci template
     * @param _accQueueQuinaryBlankSlTemplate The address of the AccQueueQuinaryBlankSl template
     */
    constructor(
        address _accQueueBinary0Template,
        address _accQueueBinaryMaciTemplate,
        address _accQueueQuinary0Template,
        address _accQueueQuinaryMaciTemplate,
        address _accQueueQuinaryBlankSlTemplate
    ) payable {
        accQueueBinary0Template = _accQueueBinary0Template;
        accQueueBinaryMaciTemplate = _accQueueBinaryMaciTemplate;
        accQueueQuinary0Template = _accQueueQuinary0Template;
        accQueueQuinaryMaciTemplate = _accQueueQuinaryMaciTemplate;
        accQueueQuinaryBlankSlTemplate = _accQueueQuinaryBlankSlTemplate;
    }

    /**
     * @notice createNewInstance deploys a new AccQueueBinary0 instance using the Clones library
     * @return clone address
     */
    function createNewInstanceBinary0(address owner, uint256 _subDepth) public returns (address clone) {
        // Deploy
        clone = Clones.clone(accQueueBinary0Template);
        
        // Initialize
        IAccQueue(clone).initialize(_subDepth, 2, owner);
           
        emit NewAccQueueBinary0Deployed(clone);
    }

    /**
     * @notice createNewInstance deploys a new AccQueueBinaryMaci instance using the Clones library
     * @return clone address
     */
    function createNewInstanceBinaryMaci(address owner, uint256 _subDepth) public returns (address clone) {
        // Deploy
        clone = Clones.clone(accQueueBinaryMaciTemplate);
        
        // Initialize
        IAccQueue(clone).initialize(_subDepth, 2, owner);
           
        emit NewAccQueueBinaryMaciDeployed(clone);
    }

    /**
     * @notice createNewInstance deploys a new AccQueueQuinary0 instance using the Clones library
     * @return clone address
     */
    function createNewInstanceQuinary0(address owner, uint256 _subDepth) public returns (address clone) {
        // Deploy
        clone = Clones.clone(accQueueQuinary0Template);

        // Initialize
        IAccQueue(clone).initialize(_subDepth, 5, owner);
   
        emit NewAccQueueQuinary0Deployed(clone);
    }

    /**
     * @notice createNewInstance deploys a new AccQueueQuinaryMaci instance using the Clones library
     * @return clone address
     */
    function createNewInstanceQuinaryMaci(address owner, uint256 _subDepth) public returns (address clone) {
        // Deploy
        clone = Clones.clone(accQueueQuinaryMaciTemplate);

        // Initialize
        IAccQueue(clone).initialize(_subDepth, 5, owner);
   
        emit NewAccQueueQuinaryMaciDeployed(clone);
    }

    /**
     * @notice createNewInstance deploys a new AccQueueQuinaryBlankSl instance using the Clones library
     * @return clone address
     */
    function createNewInstanceQuinaryBlankSl(address owner, uint256 _subDepth) public returns (address clone) {
        // Deploy
        clone = Clones.clone(accQueueQuinaryBlankSlTemplate);

        // Initialize
        IAccQueue(clone).initialize(_subDepth, 5, owner);
   
        emit NewAccQueueQuinaryBlankSlDeployed(clone);
    }
}