// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Owned } from "solmate/src/auth/Owned.sol";
import { Params } from "./Params.sol";
import { DomainObjs } from "./DomainObjs.sol";
import { Utilities } from "./Utils.sol";
import { EmptyBallotRoots } from "./trees/EmptyBallotRoots.sol";

/**
 * @title Poll
 * @author PSE
 * @notice This contract allows users to submit votes 
 */
contract Poll is Owned, Params, Utilities, EmptyBallotRoots {
    /// @notice track contract initialization
    /// to prevent double initialization
    bool public isInitialized;

    /// @notice the number of messages received 
    uint256 public numMessages;
    /// @notice the number of deactivated keys
    uint256 public numDeactivatedKeys;
    /// @notice the number of generated keys
    uint256 public numGeneratedKeys;

    /// @notice the duration of the poll
    uint256 public endTime;

    /// @notice the address of the message processor contract
    address public messageProcessorAddress;

    /// @notice Whether the MACI contract's stateAq has been merged by this contract
    bool public stateAqMerged;

    uint256 public mergedStateRoot;

    uint256 public currentSbCommitment;

    /// @notice the contracts which this contract relies on
    ExtContracts public extContracts;
    PubKey public coordinatorPubKey;
    BatchSizes public batchSizes;
    TreeDepths public treeDepths;
    MaxValues public maxValues;

    event PublishedMessage(Message _message, PubKey _pubKey);
    event TopupMessage(Message _message);
    event AttemptedKeyDeactivation(Message _message, PubKey _encPubKey);
    event AttemptedKeyGeneration(Message _message, PubKey _encPubKey, uint256 _newStateIndex);
    event MergedMaciStateAq(uint256 _mergedStateRoot);
    event MergedMaciStateAqSubRoots(uint256 _numSrQueueOps);
    event MergedMessageAqSubRoots(uint256 _numSrQueueOps);
    event MergedMessageAq(uint256 _mergedMessageRoot);

    error AlreadyInitialized();
    error VotingDeadlineExceeded();
    error VotingDeadlineNotExceeded();
    error TooManyMessages();
    error InvalidPubKey();
    error DeactivationPeriodPassed();
    error StateAqAlreadyMerged();
    error Unauthorized();
    error StateAqSubTreesNotMerged();

    modifier isWithinVotingDeadline() {
        if (block.timestamp > endTime) revert VotingDeadlineExceeded();
        _;
    }

    modifier isAfterVotingDeadline() {
        if (block.timestamp <= endTime) revert VotingDeadlineExceeded();
        _;
    }

    constructor() payable Owned(msg.sender) {}
    
    function initialize(
        address _owner,
        address _messageProcessorAddress,
        uint256 _duration,
        MaxValues memory _maxValues,
        TreeDepths memory _treeDepths,
        BatchSizes memory _batchSizes,
        PubKey memory _coordinatorPubKey,
        ExtContracts memory _extContracts
    ) external {
        // check that the contract was not init already 
        if (isInitialized) revert AlreadyInitialized();
        isInitialized = true;

        /// @notice set state variables
        owner = _owner;
        extContracts = _extContracts;
        endTime = block.timestamp + _duration;
        coordinatorPubKey = _coordinatorPubKey;
        maxValues = _maxValues;
        batchSizes = _batchSizes;
        treeDepths = _treeDepths;
        messageProcessorAddress = _messageProcessorAddress;
        
        // publish first message to the accQueue
        unchecked {
            numMessages++;
        }

        // init messageAq here by inserting placeholderLeaf
        uint256[2] memory dat;
        dat[0] = NOTHING_UP_MY_SLEEVE;
        dat[1] = 0;
        (
            Message memory _message,
            PubKey memory _padKey,
            uint256 placeholderLeaf
        ) = padAndHashMessage(dat, 1);
        extContracts.messageAq.enqueue(placeholderLeaf);

        emit PublishedMessage(_message, _padKey);
    }

    /**
     * Allows to publish a Topup message
     * @param stateIndex The index of user in the state queue
     * @param amount The amount of credits to topup
     */
    function topup(
        uint256 stateIndex,
        uint256 amount
    ) public isWithinVotingDeadline {
        /// @notice we check that we have not exceeded the max number of messages
        /// supported by the circuits
        if (numMessages == maxValues.maxMessages) revert TooManyMessages();

        // increment numMessages
        unchecked {
            numMessages++;
        }

        // transfer credits from user to this contract
        // this will fail if not enough credits
        extContracts.topupCredit.transferFrom(
            msg.sender,
            address(this),
            amount
        );

        /// @notice we create a top up message and enqueue it
        uint256[2] memory dat;
        dat[0] = stateIndex;
        dat[1] = amount;
        (Message memory _message, , uint256 messageLeaf) = padAndHashMessage(
            dat,
            2
        );
        extContracts.messageAq.enqueue(messageLeaf);

        emit TopupMessage(_message);
    }

    /**
     * Allows anyone to publish a message (an encrypted command and signature).
     * This function also enqueues the message.
     * @param _message The message to publish
     * @param _encPubKey An epheremal public key which can be combined with the
     *     coordinator's private key to generate an ECDH shared key with which
     *     to encrypt the message.
     */
    function publishMessage(
        Message memory _message,
        PubKey memory _encPubKey
    ) public isWithinVotingDeadline {
        /// @notice we check that we have not exceeded the max number of messages
        /// supported by the circuits
        if (numMessages == maxValues.maxMessages) revert TooManyMessages();

        /// @notice we check that the pub key is valid
        if (_encPubKey.x >= SNARK_SCALAR_FIELD || _encPubKey.y >= SNARK_SCALAR_FIELD) {
            revert InvalidPubKey();
        }

        unchecked {
            numMessages++;
        }

        // create a vote message
        _message.msgType = 1;
        uint256 messageLeaf = hashMessageAndEncPubKey(_message, _encPubKey);
        extContracts.messageAq.enqueue(messageLeaf);

        emit PublishedMessage(_message, _encPubKey);
    }

    /**
     * The first step of merging the MACI state AccQueue. This allows the
     * ProcessMessages circuit to access the latest state tree and ballots via
     * currentSbCommitment.
     * @param _numSrQueueOps The number of operations
     * @param _pollId The poll ID to merge the state for
     */
    function mergeMaciStateAqSubRoots(
        uint256 _numSrQueueOps,
        uint256 _pollId
    ) external {
        if (msg.sender != messageProcessorAddress || msg.sender != owner) revert Unauthorized();
        // This function cannot be called after the stateAq was merged
        if (stateAqMerged) revert StateAqAlreadyMerged();

        if (!extContracts.maci.stateAq().subTreesMerged()) {
            extContracts.maci.mergeStateAqSubRoots(_numSrQueueOps, _pollId);
            emit MergedMaciStateAqSubRoots(_numSrQueueOps);
        }
    }

    /**
     * The second step of merging the MACI state AccQueue. This allows the
     * ProcessMessages circuit to access the latest state tree and ballots via
     * currentSbCommitment.
     * @param _pollId The ID of the Poll
     */
    function mergeMaciStateAq(uint256 _pollId) external {
        if (msg.sender != messageProcessorAddress || msg.sender != owner) revert Unauthorized();
        if (stateAqMerged) revert StateAqAlreadyMerged();

        stateAqMerged = true;

        if (!extContracts.maci.stateAq().subTreesMerged()) revert StateAqSubTreesNotMerged();

        mergedStateRoot = extContracts.maci.mergeStateAq(_pollId);

        // Set currentSbCommitment
        uint256[4] memory sb;
        sb[0] = mergedStateRoot;
        sb[1] = emptyBallotRoots[treeDepths.voteOptionTreeDepth - 1];
        sb[2] = 3108394280857290448796042949317662357879960495408018998613518544538624657019; // Root of a nullifiers tree with blank 0-key 0-value leaf
        sb[3] = uint256(0);

        currentSbCommitment = hash4(sb);
        emit MergedMaciStateAq(mergedStateRoot);
    }

    /**
     * The first step in merging the message AccQueue so that the
     * ProcessMessages circuit can access the message root.
     * @param _numSrQueueOps The number of operations
     */
    function mergeMessageAqSubRoots(
        uint256 _numSrQueueOps
    ) public onlyOwner isAfterVotingDeadline {
        extContracts.messageAq.mergeSubRoots(_numSrQueueOps);
        emit MergedMessageAqSubRoots(_numSrQueueOps);
    }

    /**
     * The second step in merging the message AccQueue so that the
     * ProcessMessages circuit can access the message root.
     */
    function mergeMessageAq() public onlyOwner isAfterVotingDeadline {
        uint256 root = extContracts.messageAq.merge(
            treeDepths.messageTreeDepth
        );
        emit MergedMessageAq(root);
    }
}