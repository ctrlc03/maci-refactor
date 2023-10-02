// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPubKey } from "../DomainObjs.sol";
import { Params } from "../Params.sol";

/**
 * @title IPoll
 * @author PSE
 * @notice IPoll is an interface for the Poll contract
 */
interface IPoll {
    function initialize(
        address _owner,
        address _messageProcessorAddress,
        uint256 _duration,
        Params.MaxValues memory _maxValues,
        Params.TreeDepths memory _treeDepths,
        Params.BatchSizes memory _batchSizes,
        IPubKey.PubKey memory _coordinatorPubKey,
        Params.ExtContracts memory _extContracts
    ) external;
}
