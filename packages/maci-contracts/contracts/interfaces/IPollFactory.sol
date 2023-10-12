// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPubKey } from "../DomainObjs.sol";
import { Params } from "../Params.sol";

/**
 * @title IPollFactory
 * @author PSE
 * @notice IPollFactory is an interface for the PollFactory contract
 */
interface IPollFactory {
    function createNewInstance(
        address owner,
        address accQueueFactory,
        address _messageProcessorAddress,
        uint256 _duration,
        Params.MaxValues memory _maxValues,
        Params.TreeDepths memory _treeDepths,
        Params.BatchSizes memory _batchSizes,
        IPubKey.PubKey memory _coordinatorPubKey,
        address _maci,
        address _topupCredit
    ) external returns (address clone);
}
