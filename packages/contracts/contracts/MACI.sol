// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Owned } from "solmate/src/auth/Owned.sol";
import { InitialVoiceCreditProxy } from "./voiceCredits/InitialVoiceCreditProxy.sol";
import { Poll } from "./Poll.sol";
import { VkRegistry } from "./VkRegistry.sol";
import { IPubKey } from "./DomainObjs.sol";
import { IPollFactory } from "./interfaces/IPollFactory.sol";
import { IAccQueueFactory } from "./interfaces/IAccQueueFactory.sol";
import { IAccQueue } from "./interfaces/IAccQueue.sol";
import { ISignUpGatekeeper } from "./interfaces/ISignUpGatekeeper.sol";
import { ISignUpGatekeeperFactory } from "./interfaces/ISignUpGatekeeperFactory.sol";
import { IVkRegistryFactory } from "./interfaces/IVkRegistryFactory.sol";
import { Hasher } from "./crypto/Hasher.sol";
import { Params } from "./Params.sol";

/**
 * @title MACI
 * @dev Main contract which is used to create a new poll and send sign up messages
 */
contract MACI is Owned, IPubKey, Hasher, Params {
    /// @notice the dept of the state tree
    uint8 public constant stateTreeDepth = 10;

    /// @notice The ID of the next poll to be deployed
    uint256 nextPollId;

    /// @notice pollId => Poll
    mapping(uint256 => Poll) polls;

    /// @notice how many voters signed up
    uint256 public numSignUps;

    /// @notice sign up deadline 
    uint256 public signUpDeadline;

    /// @notice how long do users have to de-activate their keys
    uint256 public deactivationPeriod;

    /// @notice track if the contract was initialized
    bool public isInitialized;

    /// @notice the PollFactory contract
    IPollFactory public pollFactory; 
    /// @notice the AccQueueFactory contract
    IAccQueueFactory public accQueueFactoryContract;
    /// @notice the signup gatekeeper factory contract
    ISignUpGatekeeperFactory public signUpGatekeeperFactory;
    /// @notice the instance of the signup gatekeeper
    ISignUpGatekeeper public signUpGateKeeper;
    /// @notice the state AccQueue contract
    IAccQueue public stateAq;
    /// @notice the address of the VkRegistry contract
    address public vkRegistry;
    /// @notice the address of the topup credit contract
    address public topupCredit;

    /// @notice the address of the MessageProcessor contract
    address public messageProcessorAddress;

    /// @notice a contract that provides the values of the initial voice credits
    /// for voters
    InitialVoiceCreditProxy public initialVoiceCreditProxy;

    uint8 internal constant STATE_TREE_SUBDEPTH = 2;
    uint8 internal constant STATE_TREE_ARITY = 5;
    uint8 internal constant MESSAGE_TREE_ARITY = 5;

    //// The hash of a blank state leaf
    uint256 internal constant BLANK_STATE_LEAF_HASH =
        uint256(
            6769006970205099520508948723718471724660867171122235270773600567925038008762
        );


    /// @notice we keep the contract state in a enum 
    /// @dev SIGNUP -> Period where users can sign up
    /// @dev DEACTIVATION_PERIOD -> Period where users can de-activate their keys
    /// @dev ROUND_STARTED -> Period where users can send their ballots
    enum State {
        SIGNUP,
        DEACTIVATION_PERIOD,
        ROUND_STARTED
    }

    /// @notice the state of the contract
    State public state;

    /// @notice Events 
    event Init(VkRegistry _vkRegistry);
    event PollDeployed(uint256 _pollId, address _pollAddress, PubKey _publicKey);

    /// @notice Errors
    error NotInitialized();
    error NotPoll();
    error InitTwice();
    error LibrariesNotLinked();
    error PollDoesNotExist();
    error PollNotCompleted();

    /// @notice Modifiers
    /// @dev allow a function to be called only after the contract has been initialized
    modifier afterInit() {
        if (!isInitialized) revert NotInitialized();
        _;
    }

    /// @dev allow a function to be called only by a poll
    modifier onlyPoll(uint256 _pollId) {
        if (msg.sender != address(polls[_pollId])) revert NotPoll();
        _;
    }

    /**
     * @dev Empty constructor which only sets the owner
     */
    constructor() payable Owned(msg.sender) {}

    /**
     * @dev Initialize the contract
     */
    function initialize(
        address _owner,
        address _pollFactory,
        address _vkFactory,
        address _signUpGatekeeperFactory,
        address _accQueueFactory,
        uint256 _signUpPeriod,
        uint256 _deactivationPeriod,
        address _topupCredit
    ) external {
        /// @notice cannot be init twice
        if (isInitialized) revert InitTwice();

        /// @notice ensure that the Poseidon libraries are actually linked
        if (hash2([uint256(1), uint256(1)]) == 0) revert LibrariesNotLinked();

        /// @notice set initialized to true so it cannot be called again
        isInitialized = true;

        /// @notice set the owner 
        owner = _owner;

        /// @notice set the state to SIGNUP
        state = State.SIGNUP;

        /// @notice store the poll factory so we can use it later to create new polls
        pollFactory = IPollFactory(_pollFactory);

        /// @notice store the accqueue factory so we can create new AccQueues
        accQueueFactoryContract = IAccQueueFactory(_accQueueFactory);
        // deploy the state AccQueue
        stateAq = IAccQueue(accQueueFactoryContract.createNewInstanceQuinaryMaci(
            owner,
            STATE_TREE_SUBDEPTH
        ));

        signUpGatekeeperFactory = ISignUpGatekeeperFactory(_signUpGatekeeperFactory);

        /// @notice deploy a new signup gatekeeper
        signUpGateKeeper = ISignUpGatekeeper(signUpGatekeeperFactory.createNewInstance(
            _owner,
            _topupCredit,
            address(this)
        ));

        // calculate the signup deadline
        signUpDeadline = block.timestamp + _signUpPeriod;
        // deactivation period 
        /// @dev do not use signUpDeadline but re calculate to save one read 
        deactivationPeriod = block.timestamp + _signUpPeriod + _deactivationPeriod;


        // deploy the VkRegistry
        IVkRegistryFactory vkRegistryFactory = IVkRegistryFactory(_vkFactory);
        vkRegistry = vkRegistryFactory.createNewInstance(
            _owner
        );

        // store the topup credit contract
        topupCredit = _topupCredit;
    }

    /**
     * Deploy a new Poll contract.
     * @param _duration How long should the Poll last for
     * @param _treeDepths The depth of the Merkle trees
     */
    function deployPoll(
        address _messageProcessorAddress,
        uint256 _duration,
        MaxValues memory _maxValues,
        TreeDepths memory _treeDepths,
        PubKey memory _coordinatorPubKey
    ) public afterInit {
        // cache the pollId 
        uint256 pollId = nextPollId;

        // Increment the poll ID for the next poll
        // 2 ** 256 polls available
        unchecked {
            nextPollId++;
        }

        // if any polls were deployed before, the state tree must have been merged before 
        // a new poll can be deployed
        if (pollId > 0 && !stateAq.treeMerged()) revert PollNotCompleted();

        // The message batch size and the tally batch size
        BatchSizes memory batchSizes = BatchSizes(
            uint24(MESSAGE_TREE_ARITY) ** _treeDepths.messageTreeSubDepth,
            uint24(STATE_TREE_ARITY) ** _treeDepths.intStateTreeDepth,
            uint24(STATE_TREE_ARITY) ** _treeDepths.intStateTreeDepth
        );

        // // use the poll factory to deploy a new Poll contract
        // Poll p = pollFactory.deploy(
        //     _messageProcessorAddress,
        //     _duration,
        //     _maxValues,
        //     _treeDepths,
        //     batchSizes,
        //     _coordinatorPubKey,
        //     vkRegistry,
        //     this,
        //     topupCredit,
        //     owner
        // );

        // polls[pollId] = p;

        // emit PollDeployed(pollId, address(p), _coordinatorPubKey);
    }

    /**
     * Allow Poll contracts to merge the state subroots
     * @param _numSrQueueOps Number of operations
     * @param _pollId The active Poll ID
     */
    function mergeStateAqSubRoots(
        uint256 _numSrQueueOps,
        uint256 _pollId
    ) public onlyPoll(_pollId) afterInit {
        stateAq.mergeSubRoots(_numSrQueueOps);
    }

    /** 
     * Allow Poll contracts to merge the state root
     * @param _pollId The active Poll ID
     * @return root The calculated Merkle root
     */
    function mergeStateAq(
        uint256 _pollId
    ) public onlyPoll(_pollId) afterInit returns (uint256 root) {
        root = stateAq.merge(stateTreeDepth);
    }


    /**
     * Return the main root of the StateAq contract
     * @return The Merkle root
     */
    function getStateAqRoot() external view returns (uint256) {
        return stateAq.getMainRoot(stateTreeDepth);
    }

    /**
     * Get the details of a Poll
     * @param _pollId The ID of the poll
     * @return Poll The poll
     */
    function getPoll(uint256 _pollId) external view returns (Poll) {
        if (_pollId >= nextPollId) revert PollDoesNotExist();
        return polls[_pollId];
    }
}