// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Owned } from "solmate/src/auth/Owned.sol";
import { InitialVoiceCreditProxy } from "./voiceCredits/InitialVoiceCreditProxy.sol";
import { VkRegistry } from "./VkRegistry.sol";
import { DomainObjs } from "./DomainObjs.sol";
import { IPollFactory } from "./interfaces/IPollFactory.sol";
import { IAccQueueFactory } from "./interfaces/IAccQueueFactory.sol";
import { IAccQueue } from "./interfaces/IAccQueue.sol";
import { ISignUpGatekeeper } from "./interfaces/ISignUpGatekeeper.sol";
import { ISignUpGatekeeperFactory } from "./interfaces/ISignUpGatekeeperFactory.sol";
import { IVkRegistryFactory } from "./interfaces/IVkRegistryFactory.sol";
import { Hasher } from "./crypto/Hasher.sol";
import { Params } from "./Params.sol";
import { IPoll } from "./interfaces/IPoll.sol";

/**
 * @title MACI
 * @dev Main contract which is used to create a new poll and send sign up messages
 */
contract MACI is Owned, Hasher, DomainObjs, Params {
    /// @notice the dept of the state tree
    uint8 public constant stateTreeDepth = 10;

    /// @notice The ID of the next poll to be deployed
    uint256 nextPollId;

    /// @notice pollId => Poll
    mapping(uint256 => IPoll) polls;

    /// @notice how many voters signed up
    uint256 public numSignUps;

    /// @notice sign up deadline 
    uint256 public signUpDeadline;

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

    /// @notice The hash of a blank state leaf
    uint256 internal constant BLANK_STATE_LEAF_HASH =
        uint256(
            6769006970205099520508948723718471724660867171122235270773600567925038008762
        );

    /// @notice Events 
    event Init(VkRegistry _vkRegistry);
    event PollDeployed(uint256 _pollId, address _pollAddress, PubKey _publicKey);
    event SignUp(uint256 stateIndex, PubKey _publicKey, uint256 voiceCreditBalance, uint256 timestamp);

    /// @notice Errors
    error NotInitialized();
    error NotPoll();
    error InitTwice();
    error LibrariesNotLinked();
    error PollDoesNotExist();
    error PollNotCompleted();
    error TooManySignups();
    error InvalidPubKey();

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
     * @param _owner The owner of the contract
     * @param _pollFactory The address of the PollFactory contract
     * @param _vkFactory The address of the VkFactory contract
     * @param _signUpGatekeeperFactory The address of the SignUpGatekeeperFactory contract
     * @param _accQueueFactory The address of the AccQueueFactory contract
     * @param _signUpPeriod The sign up period
     * @param _topupCredit The address of the topup credit contract
     */
    function initialize(
        address _owner,
        address _pollFactory,
        address _vkFactory,
        address _signUpGatekeeperFactory,
        address _accQueueFactory,
        uint256 _signUpPeriod,
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

        /// @notice if any polls were deployed before, the state tree must have been merged before 
        // a new poll can be deployed
        if (pollId > 0 && !stateAq.treeMerged()) revert PollNotCompleted();

        // The message batch size and the tally batch size
        BatchSizes memory batchSizes = BatchSizes(
            uint24(MESSAGE_TREE_ARITY) ** _treeDepths.messageTreeSubDepth,
            uint24(STATE_TREE_ARITY) ** _treeDepths.intStateTreeDepth,
            uint24(STATE_TREE_ARITY) ** _treeDepths.intStateTreeDepth
        );

        // deploy the new poll contract
        address poll = pollFactory.createNewInstance(
            owner,
            address(accQueueFactoryContract),
            _messageProcessorAddress,
            _duration,
            _maxValues,
            _treeDepths,
            batchSizes,
            _coordinatorPubKey,
            address(this),
            topupCredit
        );

        polls[pollId] = IPoll(poll);

        emit PollDeployed(pollId, address(poll), _coordinatorPubKey);
    }

    /**
     * Allows any eligible user sign up. The sign-up gatekeeper should prevent
     * double sign-ups or ineligible users from doing so.  This function will
     * only succeed if the sign-up deadline has not passed. It also enqueues a
     * fresh state leaf into the state AccQueue.
     * @param _publicKey The user's public key
     * @param _signUpGatekeeperData Data to pass to the sign-up gatekeeper's
     *     register() function. For instance, the POAPGatekeeper or
     *     SignUpTokenGatekeeper requires this value to be the ABI-encoded
     *     token ID. 
     * @param _initialVoiceCreditProxyData Data to pass to the
     *     InitialVoiceCreditProxy, which allows it to determine how many voice
     *     credits this user should have.
     */
    function signUp(
        PubKey memory _publicKey,
        bytes memory _signUpGatekeeperData,
        bytes memory _initialVoiceCreditProxyData
    ) external afterInit returns (uint256 stateIndex) {
        // validation first
        // cannot have more signups than the tree can hold
        if (numSignUps >= uint256(STATE_TREE_ARITY) ** uint256(stateTreeDepth)) revert TooManySignups();
        /// @notice we check that the pub key is valid
        if (_publicKey.x >= SNARK_SCALAR_FIELD || _publicKey.y >= SNARK_SCALAR_FIELD) {
            revert InvalidPubKey();
        }

        // increase the number of signups
        // cannot overflow as we cannot process uint256.max in our circuits
        unchecked {
            numSignUps++;
        }

        /// @notice external call to the signup gatekeeper
        /// @notice this should throw if the user is not elegible to signup
        signUpGateKeeper.register(msg.sender, _signUpGatekeeperData);

        // we calculate the user's voice credit balance
        uint256 voiceCreditBalance = initialVoiceCreditProxy.getVoiceCredits(
            msg.sender,
            _initialVoiceCreditProxyData
        );
        
        uint256 timestamp = block.timestamp;
        // create a new state leaf and add it to the acc queue
        uint256 stateLeaf = hashStateLeaf(
            StateLeaf({
                pubKey: _publicKey,
                voiceCreditBalance: voiceCreditBalance,
                timestamp: timestamp
            })
        );

        stateIndex = stateAq.enqueue(stateLeaf);

        emit SignUp(stateIndex, _publicKey, voiceCreditBalance, timestamp);
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
    function getPoll(uint256 _pollId) external view returns (IPoll) {
        if (_pollId >= nextPollId) revert PollDoesNotExist();
        return polls[_pollId];
    }
}