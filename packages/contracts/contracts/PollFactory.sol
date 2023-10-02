// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IPoll } from "./interfaces/IPoll.sol";
import { IPubKey } from "./DomainObjs.sol";
import { Params } from "./Params.sol";
import { IVkRegistry } from "./interfaces/IVkRegistry.sol";
import { IMaci } from "./interfaces/IMaci.sol";
import { ITopupCredit } from "./interfaces/ITopupCredit.sol";
import { IAccQueueFactory } from "./interfaces/IAccQueueFactory.sol";
import { IAccQueue } from "./interfaces/IAccQueue.sol";

/**
 * @title PollFactory
 * @author PSE
 * @notice A contract that can be used to deploy new instances a Poll contract
 */
contract PollFactory is IPubKey, Params {
    address immutable pollTemplate;

    event NewPollDeployed(address _poll);

    constructor(address _pollTemplate) payable {
        pollTemplate = _pollTemplate;
    }

    /**
     * Create a new instance of a Poll
     * @param owner the address of the owner of the poll
     * @param _messageProcessorAddress address of the message processor contract 
     * @param _duration the duration of the poll
     * @param _maxValues the max values for the poll
     * @param _treeDepths the tree depths for the poll trees
     * @param _batchSizes the batch sizes for the poll
     * @param _coordinatorPubKey the coordinator's public key
     * @param _maci the address of the maci instance
     * @param _topupCredit the address of the topup credit contract
     */
    function createNewInstance(
        address owner,
        address accQueueFactory,
        address _messageProcessorAddress,
        uint256 _duration,
        MaxValues memory _maxValues,
        TreeDepths memory _treeDepths,
        BatchSizes memory _batchSizes,
        PubKey memory _coordinatorPubKey,
        address _maci,
        address _topupCredit
    ) external returns (address clone) {
        // Deploy
        clone = Clones.clone(pollTemplate);

        // Deploy a new AccQueue contract for messages.
        address messageAq = IAccQueueFactory(accQueueFactory).createNewInstanceQuinaryMaci(
            clone,
            _treeDepths.messageTreeSubDepth
        );
        
        // Deploy a new AccQueue contract for deactivated keys.
        address deactivatedKeysAq = IAccQueueFactory(accQueueFactory).createNewInstanceQuinaryMaci(
            _messageProcessorAddress,
            _treeDepths.messageTreeSubDepth
        );
        
        // Initialize
        IPoll(clone).initialize(
            owner,
            _messageProcessorAddress,
            _duration,
            _maxValues,
            _treeDepths,
            _batchSizes,
            _coordinatorPubKey,
            ExtContracts({
                vkRegistry: IVkRegistry(address(0)),
                maci: IMaci(_maci),
                topupCredit: ITopupCredit(_topupCredit),
                messageAq: IAccQueue(messageAq),
                deactivatedKeysAq: IAccQueue(deactivatedKeysAq)
            })
        );

        emit NewPollDeployed(clone);
    }

}