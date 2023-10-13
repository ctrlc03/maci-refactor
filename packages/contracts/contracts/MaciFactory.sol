// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
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
    //  */
    function createNewInstance(
        address _owner,
        uint256 _pollFactory,
        uint256 _vkFactory,
        uint256 _signUpGatekeeperFactory,
        uint256 _accQueueFactory,
        uint256 _signUpPeriod,
        address _topupCredit
    ) public returns (address clone) {
        // Deploy
        clone = Clones.clone(maciTemplate);
        
        // Initialize
        IMaci(clone).initialize(
            _owner,
            _pollFactory,
            _vkFactory,
            _signUpGatekeeperFactory,
            _accQueueFactory,
            _signUpPeriod,
            _topupCredit
        );

        emit NewMaciDepoyed(clone);
    }
}