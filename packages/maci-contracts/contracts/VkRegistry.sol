// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SnarkCommon } from "./crypto/SnarkCommon.sol";
import { Owned } from "solmate/src/auth/Owned.sol";

/**
 * @title VKRegistry
 * Stores verifying keys for the circuits.
 * Each circuit has a signature which is its compile-time constants represented
 * as a uint256.
 */
contract VkRegistry is Owned, SnarkCommon {
    mapping(uint256 => VerifyingKey) internal processVks;
    mapping(uint256 => bool) internal processVkSet;

    mapping(uint256 => VerifyingKey) internal processDeactivationVks;
    mapping(uint256 => bool) internal processDeactivationVkSet;

    mapping(uint256 => VerifyingKey) internal tallyVks;
    mapping(uint256 => bool) internal tallyVkSet;

    mapping(uint256 => VerifyingKey) internal subsidyVks;
    mapping(uint256 => bool) internal subsidyVkSet;

    mapping(uint256 => VerifyingKey) internal newKeyGenerationVks;
    mapping(uint256 => bool) internal newKeyGenerationVkSet;

    bool public isInitialized;

    error AlreadyInitialized();

    event ProcessVkSet(uint256 _sig);
    event ProcessDeactivationVkSet(uint256 _sig);
    event TallyVkSet(uint256 _sig);
    event SubsidyVkSet(uint256 _sig);
    event NewKeyGenerationVkSet(uint256 _sig);

    constructor() payable Owned(msg.sender) {}

    /**
     * Initialize the contract by setting the owner
     * @param _owner The owner of the contract
     */
    function initialize(address _owner) external {
        if (isInitialized) revert AlreadyInitialized();
        isInitialized = true;
        owner = _owner;
    }

    /**
     * @dev Checks if the process messages verifying key has been set
     * @param _sig The signature of the verifying key
     * @return bool indicating if the process messages verifying key has been set
     */
    function isProcessVkSet(uint256 _sig) public view returns (bool) {
        return processVkSet[_sig];
    }

    /**
     * @dev Checks if the tally votes verifying key has been set
     * @param _sig  The signature of the verifying key
     * @return bool indicating if the tally votes verifying key has been set
     */
    function isTallyVkSet(uint256 _sig) public view returns (bool) {
        return tallyVkSet[_sig];
    }

    /**
     * @dev Checks if the subsidy verifying key has been set
     * @param _sig The signature of the verifying key
     * @return bool indicating if the subsidy verifying key has been set
     */
    function isSubsidyVkSet(uint256 _sig) public view returns (bool) {
        return subsidyVkSet[_sig];
    }

    /**
     * @dev Checks if the generate new key verification key has been set
     * @param _sig The signature of the verifying key
     * @return bool indicating if the generate new key verification key has been set
     */
    function isGenNewKeyGenerationVkSet(uint256 _sig) public view returns (bool) {
        return newKeyGenerationVkSet[_sig];
    }

    /**
     * @dev Generates a signature for the process verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _messageTreeDepth The depth of the message tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @param _messageBatchSize The size of the message batch
     * @return uint256 The generated signature
     */
    function genProcessVkSig(
        uint256 _stateTreeDepth,
        uint256 _messageTreeDepth,
        uint256 _voteOptionTreeDepth,
        uint256 _messageBatchSize
    ) public pure returns (uint256) {
        return
            (_messageBatchSize << 192) +
            (_stateTreeDepth << 128) +
            (_messageTreeDepth << 64) +
            _voteOptionTreeDepth;
    }

    /**
     * @dev Generates a signature for the process deactivation verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _deactivationTreeDepth The depth of the deactivation tree
     * @return uint256 The generated signature
     */
    function genProcessDeactivationVkSig(
        uint256 _stateTreeDepth,
        uint256 _deactivationTreeDepth
    ) public pure returns (uint256) {
        return (_stateTreeDepth << 128) + _deactivationTreeDepth;
    }

    /**
     * @dev Generates a signature for the tally verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @return uint256 The generated signature
     */
    function genTallyVkSig(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth
    ) public pure returns (uint256) {
        return
            (_stateTreeDepth << 128) +
            (_intStateTreeDepth << 64) +
            _voteOptionTreeDepth;
    }


    /**
     * @dev Generates a signature for the subsidy verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @return uint256 The generated signature
     */
    function genSubsidyVkSig(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth
    ) public pure returns (uint256) {
        return
            (_stateTreeDepth << 128) +
            (_intStateTreeDepth << 64) +
            _voteOptionTreeDepth;
    }

    /**
     * @dev Generates a signature for the new key generation verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _messageTreeDepth The depth of the message tree
     * @return uint256 The generated signature
     */
    function genNewKeyGenerationVkSig(
        uint256 _stateTreeDepth,
        uint256 _messageTreeDepth
    ) public pure returns (uint256) {
        return
            (_stateTreeDepth << 128) + _messageTreeDepth;
    }


    /**
     * @dev Sets the verifying keys
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _messageTreeDepth The depth of the message tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @param _messageBatchSize The size of the message batch
     * @param _processVk The process verifying key
     * @param _deactivationVk The deactivation verifying key
     * @param _tallyVk The tally verifying key
     * @param _newKeyGenerationVk The new key generation verifying key
     */
    function setVerifyingKeys(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _messageTreeDepth,
        uint256 _voteOptionTreeDepth,
        uint256 _messageBatchSize,
        VerifyingKey memory _processVk,
        VerifyingKey memory _deactivationVk,
        VerifyingKey memory _tallyVk,
        VerifyingKey memory _newKeyGenerationVk
    ) public onlyOwner {
        uint256 processVkSig = genProcessVkSig(
            _stateTreeDepth,
            _messageTreeDepth,
            _voteOptionTreeDepth,
            _messageBatchSize
        );

        require(
            !processVkSet[processVkSig],
            "VkRegistry: process vk already set"
        );

        uint256 deactivationVkSig = genProcessDeactivationVkSig(
            _stateTreeDepth,
            _messageTreeDepth
        );

        require(
            !processDeactivationVkSet[deactivationVkSig],
            "VkRegistry: process deactivation vk already set"
        );

        uint256 tallyVkSig = genTallyVkSig(
            _stateTreeDepth,
            _intStateTreeDepth,
            _voteOptionTreeDepth
        );

        require(!tallyVkSet[tallyVkSig], "VkRegistry: tally vk already set");

        uint256 newKeyGenerationVkSig = genNewKeyGenerationVkSig(
            _stateTreeDepth,
            _messageTreeDepth
        );

        require(
            !newKeyGenerationVkSet[newKeyGenerationVkSig],
            "VkRegistry: new key generation vk already set"
        );

        VerifyingKey storage processVk = processVks[processVkSig];
        processVk.alpha1 = _processVk.alpha1;
        processVk.beta2 = _processVk.beta2;
        processVk.gamma2 = _processVk.gamma2;
        processVk.delta2 = _processVk.delta2;
        for (uint8 i = 0; i < _processVk.ic.length; i++) {
            processVk.ic.push(_processVk.ic[i]);
        }

        processVkSet[processVkSig] = true;

        VerifyingKey storage deactivationVk = processDeactivationVks[
            deactivationVkSig
        ];
        deactivationVk.alpha1 = _deactivationVk.alpha1;
        deactivationVk.beta2 = _deactivationVk.beta2;
        deactivationVk.gamma2 = _deactivationVk.gamma2;
        deactivationVk.delta2 = _deactivationVk.delta2;
        for (uint8 i = 0; i < _deactivationVk.ic.length; i++) {
            deactivationVk.ic.push(_deactivationVk.ic[i]);
        }

        processDeactivationVkSet[deactivationVkSig] = true;

        VerifyingKey storage tallyVk = tallyVks[tallyVkSig];
        tallyVk.alpha1 = _tallyVk.alpha1;
        tallyVk.beta2 = _tallyVk.beta2;
        tallyVk.gamma2 = _tallyVk.gamma2;
        tallyVk.delta2 = _tallyVk.delta2;
        for (uint8 i = 0; i < _tallyVk.ic.length; i++) {
            tallyVk.ic.push(_tallyVk.ic[i]);
        }
        tallyVkSet[tallyVkSig] = true;

        VerifyingKey storage newKeyGenerationVk = newKeyGenerationVks[newKeyGenerationVkSig];
        newKeyGenerationVk.alpha1 = _newKeyGenerationVk.alpha1;
        newKeyGenerationVk.beta2 = _newKeyGenerationVk.beta2;
        newKeyGenerationVk.gamma2 = _newKeyGenerationVk.gamma2;
        newKeyGenerationVk.delta2 = _newKeyGenerationVk.delta2;
        for (uint8 i = 0; i < _newKeyGenerationVk.ic.length; i++) {
            newKeyGenerationVk.ic.push(_newKeyGenerationVk.ic[i]);
        }
        newKeyGenerationVkSet[newKeyGenerationVkSig] = true;

        emit NewKeyGenerationVkSet(newKeyGenerationVkSig);
        emit TallyVkSet(tallyVkSig);
        emit ProcessDeactivationVkSet(deactivationVkSig);
        emit ProcessVkSet(processVkSig);
    }

    /**
     * @dev Sets the subsidy keys
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @param _subsidyVk The subsidy verifying key
     */
    function setSubsidyKeys(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth,
        VerifyingKey memory _subsidyVk
    ) public onlyOwner {
        uint256 subsidyVkSig = genSubsidyVkSig(
            _stateTreeDepth,
            _intStateTreeDepth,
            _voteOptionTreeDepth
        );

        require(
            !subsidyVkSet[subsidyVkSig],
            "VkRegistry: subsidy vk already set"
        );

        VerifyingKey storage subsidyVk = subsidyVks[subsidyVkSig];
        subsidyVk.alpha1 = _subsidyVk.alpha1;
        subsidyVk.beta2 = _subsidyVk.beta2;
        subsidyVk.gamma2 = _subsidyVk.gamma2;
        subsidyVk.delta2 = _subsidyVk.delta2;
        for (uint8 i = 0; i < _subsidyVk.ic.length; i++) {
            subsidyVk.ic.push(_subsidyVk.ic[i]);
        }
        subsidyVkSet[subsidyVkSig] = true;

        emit SubsidyVkSet(subsidyVkSig);
    }

    /**
     * @dev Checks if the process verifying key has been set
     * @param _stateTreeDepth The depth of the state tree
     * @param _messageTreeDepth The depth of the message tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @param _messageBatchSize The size of the message batch
     * @return bool indicating if the process verifying key has been set
     */
    function hasProcessVk(
        uint256 _stateTreeDepth,
        uint256 _messageTreeDepth,
        uint256 _voteOptionTreeDepth,
        uint256 _messageBatchSize
    ) public view returns (bool) {
        uint256 sig = genProcessVkSig(
            _stateTreeDepth,
            _messageTreeDepth,
            _voteOptionTreeDepth,
            _messageBatchSize
        );
        return processVkSet[sig];
    }

    /**
     * @dev Gets the process verifying key by its signature
     * @param _sig The signature of the verifying key
     * @return VerifyingKey The process verifying key
     */
    function getProcessVkBySig(
        uint256 _sig
    ) public view returns (VerifyingKey memory) {
        require(
            processVkSet[_sig],
            "VkRegistry: process verifying key not set"
        );

        return processVks[_sig];
    }

    /**
     * @dev Gets the process verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _messageTreeDepth The depth of the message tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @param _messageBatchSize The size of the message batch
     * @return VerifyingKey The process verifying key
     */
    function getProcessVk(
        uint256 _stateTreeDepth,
        uint256 _messageTreeDepth,
        uint256 _voteOptionTreeDepth,
        uint256 _messageBatchSize
    ) public view returns (VerifyingKey memory) {
        uint256 sig = genProcessVkSig(
            _stateTreeDepth,
            _messageTreeDepth,
            _voteOptionTreeDepth,
            _messageBatchSize
        );

        return getProcessVkBySig(sig);
    }

    /**
     * @dev Gets the process deactivation verifying key by its signature
     * @param _sig The signature of the verifying key
     * @return VerifyingKey The process deactivation verifying key
     */
    function getProcessDeactivationVkBySig(
        uint256 _sig
    ) public view returns (VerifyingKey memory) {
        require(
            processDeactivationVkSet[_sig],
            "VkRegistry: deactivation verifying key not set"
        );

        return processDeactivationVks[_sig];
    }

    /**
     * @dev Gets the process deactivation verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _deactivationTreeDepth The depth of the deactivation tree
     * @return VerifyingKey The process deactivation verifying key
     */
    function getProcessDeactivationVk(
        uint256 _stateTreeDepth,
        uint256 _deactivationTreeDepth
    ) public view returns (VerifyingKey memory) {
        uint256 sig = genProcessDeactivationVkSig(
            _stateTreeDepth,
            _deactivationTreeDepth
        );

        return getProcessDeactivationVkBySig(sig);
    }

    /**
     * @dev Checks if the tally verifying key has been set
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @return bool indicating if the tally verifying key has been set
     */
    function hasTallyVk(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth
    ) public view returns (bool) {
        uint256 sig = genTallyVkSig(
            _stateTreeDepth,
            _intStateTreeDepth,
            _voteOptionTreeDepth
        );

        return tallyVkSet[sig];
    }

    /**
     * @dev Gets the tally verifying key by its signature
     * @param _sig The signature of the verifying key
     * @return VerifyingKey The tally verifying key
     */
    function getTallyVkBySig(
        uint256 _sig
    ) public view returns (VerifyingKey memory) {
        require(tallyVkSet[_sig], "VkRegistry: tally verifying key not set");

        return tallyVks[_sig];
    }

    /**
     * @dev Gets the tally verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @return VerifyingKey The tally verifying key
     */
    function getTallyVk(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth
    ) public view returns (VerifyingKey memory) {
        uint256 sig = genTallyVkSig(
            _stateTreeDepth,
            _intStateTreeDepth,
            _voteOptionTreeDepth
        );

        return getTallyVkBySig(sig);
    }

    /**
     * @dev Gets the new key generation verifying key by its signature
     * @param _sig The signature of the verifying key
     * @return VerifyingKey The new key generation verifying key
     */
    function getnewKeyGenerationVkBySig(
        uint256 _sig
    ) public view returns (VerifyingKey memory) {
        require(
            newKeyGenerationVkSet[_sig],
            "VkRegistry: new key generation verifying key not set"
        );

        return newKeyGenerationVks[_sig];
    }

    /**
     * @dev Gets the new key generation verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _messageTreeDepth The depth of the message tree
     * @return VerifyingKey The new key generation verifying key
     */
    function getNewKeyGenerationVk(
        uint256 _stateTreeDepth,
        uint256 _messageTreeDepth
    ) public view returns (VerifyingKey memory) {
        uint256 sig = genNewKeyGenerationVkSig(
            _stateTreeDepth,
            _messageTreeDepth
        );

        return getnewKeyGenerationVkBySig(sig);
    }

    /**
     * @dev Checks if the subsidy verifying key has been set
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @return bool indicating if the subsidy verifying key has been set
     */
    function hasSubsidyVk(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth
    ) public view returns (bool) {
        uint256 sig = genSubsidyVkSig(
            _stateTreeDepth,
            _intStateTreeDepth,
            _voteOptionTreeDepth
        );

        return subsidyVkSet[sig];
    }

    /**
     * @dev Gets the subsidy verifying key by its signature
     * @param _sig The signature of the verifying key
     * @return VerifyingKey The subsidy verifying key
     */
    function getSubsidyVkBySig(
        uint256 _sig
    ) public view returns (VerifyingKey memory) {
        require(
            subsidyVkSet[_sig],
            "VkRegistry: subsidy verifying key not set"
        );

        return subsidyVks[_sig];
    }

    /**
     * @dev Gets the subsidy verifying key
     * @param _stateTreeDepth The depth of the state tree
     * @param _intStateTreeDepth The depth of the intermediate state tree
     * @param _voteOptionTreeDepth The depth of the vote option tree
     * @return VerifyingKey The subsidy verifying key
     */
    function getSubsidyVk(
        uint256 _stateTreeDepth,
        uint256 _intStateTreeDepth,
        uint256 _voteOptionTreeDepth
    ) public view returns (VerifyingKey memory) {
        uint256 sig = genSubsidyVkSig(
            _stateTreeDepth,
            _intStateTreeDepth,
            _voteOptionTreeDepth
        );

        return getSubsidyVkBySig(sig);
    }
}
