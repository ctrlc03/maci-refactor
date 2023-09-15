// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IOwned } from "./interfaces/IOwned.sol";
import { IMaci } from "./interfaces/IMaci.sol";

/**
 * @title MaciFactory
 * @author PSE
 * @notice MaciFactory is a contract that can be used to deploy new MACI instances
 * using the Clones library
 */
contract MaciFactory {
    address immutable maciTemplate;

    event NewMaciDepoyed(address _maci);

    constructor(address _maciTemplate) payable {
        maciTemplate = _maciTemplate;
    }

    // /**
    //  * @dev createNewInstance deploys a new MACI instance using the Clones library
    //  * @param _messageProcessorAddress The address of the message processor contract
    //  * @param _duration 
    //  * @param _maxValues 
    //  * @param _treeDepths 
    //  * @param _batchSizes 
    //  * @param _coordinatorPubKey 
    //  * @param _vkRegistry 
    //  * @param _maci 
    //  * @param _topupCredit 
    //  * @param _pollOwner 
    //  * @return clone address
    //  */
    function createNewInstance(
        address _messageProcessorAddress,
        uint256 _duration,
        uint256 _maxValues,
        uint256 _treeDepths,
        uint256 _batchSizes,
        uint256 _coordinatorPubKey,
        address _vkRegistry,
        address _maci,
        address _topupCredit,
        address _pollOwner
    ) public returns (address clone) {
        // Deploy
        clone = Clones.clone(maciTemplate);

        // transfer ownership to the caller
        IOwned(clone).transferOwnership(_pollOwner);
        
        // Initialize
        IMaci(clone).initialize(
            _messageProcessorAddress,
            _duration,
            _maxValues,
            _treeDepths,
            _batchSizes,
            _coordinatorPubKey,
            _vkRegistry,
            _maci,
            _topupCredit,
            _pollOwner
        );

        emit NewMaciDepoyed(clone);
    }
}