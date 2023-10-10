# Solidity API

## Pairing

### PRIME_Q

```solidity
uint256 PRIME_Q
```

### G1Point

```solidity
struct G1Point {
  uint256 x;
  uint256 y;
}
```

### G2Point

```solidity
struct G2Point {
  uint256[2] x;
  uint256[2] y;
}
```

### negate

```solidity
function negate(struct Pairing.G1Point p) internal pure returns (struct Pairing.G1Point)
```

### plus

```solidity
function plus(struct Pairing.G1Point p1, struct Pairing.G1Point p2) internal view returns (struct Pairing.G1Point r)
```

### scalar_mul

```solidity
function scalar_mul(struct Pairing.G1Point p, uint256 s) internal view returns (struct Pairing.G1Point r)
```

### pairing

```solidity
function pairing(struct Pairing.G1Point a1, struct Pairing.G2Point a2, struct Pairing.G1Point b1, struct Pairing.G2Point b2, struct Pairing.G1Point c1, struct Pairing.G2Point c2, struct Pairing.G1Point d1, struct Pairing.G2Point d2) internal view returns (bool)
```

## SnarkCommon

### VerifyingKey

```solidity
struct VerifyingKey {
  struct Pairing.G1Point alpha1;
  struct Pairing.G2Point beta2;
  struct Pairing.G2Point gamma2;
  struct Pairing.G2Point delta2;
  struct Pairing.G1Point[] ic;
}
```

## SnarkConstants

### SNARK_SCALAR_FIELD

```solidity
uint256 SNARK_SCALAR_FIELD
```

### PAD_PUBKEY_X

```solidity
uint256 PAD_PUBKEY_X
```

### PAD_PUBKEY_Y

```solidity
uint256 PAD_PUBKEY_Y
```

### NOTHING_UP_MY_SLEEVE

```solidity
uint256 NOTHING_UP_MY_SLEEVE
```

## IVerifier

### verify

```solidity
function verify(uint256[8], struct SnarkCommon.VerifyingKey, uint256) public view virtual returns (bool)
```

## MockVerifier

### result

```solidity
bool result
```

### verify

```solidity
function verify(uint256[8], struct SnarkCommon.VerifyingKey, uint256) public view returns (bool)
```

## Verifier

### Proof

```solidity
struct Proof {
  struct Pairing.G1Point a;
  struct Pairing.G2Point b;
  struct Pairing.G1Point c;
}
```

### PRIME_Q

```solidity
uint256 PRIME_Q
```

### ERROR_PROOF_Q

```solidity
string ERROR_PROOF_Q
```

### ERROR_INPUT_VAL

```solidity
string ERROR_INPUT_VAL
```

### verify

```solidity
function verify(uint256[8] _proof, struct SnarkCommon.VerifyingKey vk, uint256 input) public view returns (bool)
```

## MessageProcessor

MessageProcessor is used to process messages published by signup users
        it will process messages in batches. After processing, 
        the sbCommitment will be used for the Tally and the Subsidy contracts

### isInitialized

```solidity
bool isInitialized
```

### verifier

```solidity
contract IVerifier verifier
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### constructor

```solidity
constructor() public payable
```

### initialize

```solidity
function initialize(address _owner, address _verifier) external
```

## IVerifier

IVerifier is the Verifier's contract interface

### verify

```solidity
function verify(uint256[8] _proof, struct SnarkCommon.VerifyingKey vk, uint256 input) external view returns (bool)
```

## IPubKey

### PubKey

```solidity
struct PubKey {
  uint256 x;
  uint256 y;
}
```

## IMessage

### MESSAGE_DATA_LENGTH

```solidity
uint8 MESSAGE_DATA_LENGTH
```

### Message

```solidity
struct Message {
  uint256 msgType;
  uint256[10] data;
}
```

## DomainObjs

### StateLeaf

```solidity
struct StateLeaf {
  struct IPubKey.PubKey pubKey;
  uint256 voiceCreditBalance;
  uint256 timestamp;
}
```

### hashStateLeaf

```solidity
function hashStateLeaf(struct DomainObjs.StateLeaf _stateLeaf) public pure returns (uint256)
```

## MACI

_Main contract which is used to create a new poll and send sign up messages_

### stateTreeDepth

```solidity
uint8 stateTreeDepth
```

the dept of the state tree

### nextPollId

```solidity
uint256 nextPollId
```

The ID of the next poll to be deployed

### polls

```solidity
mapping(uint256 => contract IPoll) polls
```

pollId => Poll

### numSignUps

```solidity
uint256 numSignUps
```

how many voters signed up

### signUpDeadline

```solidity
uint256 signUpDeadline
```

sign up deadline

### deactivationPeriod

```solidity
uint256 deactivationPeriod
```

how long do users have to de-activate their keys

### isInitialized

```solidity
bool isInitialized
```

track if the contract was initialized

### pollFactory

```solidity
contract IPollFactory pollFactory
```

the PollFactory contract

### accQueueFactoryContract

```solidity
contract IAccQueueFactory accQueueFactoryContract
```

the AccQueueFactory contract

### signUpGatekeeperFactory

```solidity
contract ISignUpGatekeeperFactory signUpGatekeeperFactory
```

the signup gatekeeper factory contract

### signUpGateKeeper

```solidity
contract ISignUpGatekeeper signUpGateKeeper
```

the instance of the signup gatekeeper

### stateAq

```solidity
contract IAccQueue stateAq
```

the state AccQueue contract

### vkRegistry

```solidity
address vkRegistry
```

the address of the VkRegistry contract

### topupCredit

```solidity
address topupCredit
```

the address of the topup credit contract

### messageProcessorAddress

```solidity
address messageProcessorAddress
```

the address of the MessageProcessor contract

### initialVoiceCreditProxy

```solidity
contract InitialVoiceCreditProxy initialVoiceCreditProxy
```

a contract that provides the values of the initial voice credits
for voters

### STATE_TREE_SUBDEPTH

```solidity
uint8 STATE_TREE_SUBDEPTH
```

### STATE_TREE_ARITY

```solidity
uint8 STATE_TREE_ARITY
```

### MESSAGE_TREE_ARITY

```solidity
uint8 MESSAGE_TREE_ARITY
```

### BLANK_STATE_LEAF_HASH

```solidity
uint256 BLANK_STATE_LEAF_HASH
```

The hash of a blank state leaf

### Init

```solidity
event Init(contract VkRegistry _vkRegistry)
```

Events

### PollDeployed

```solidity
event PollDeployed(uint256 _pollId, address _pollAddress, struct IPubKey.PubKey _publicKey)
```

### NotInitialized

```solidity
error NotInitialized()
```

Errors

### NotPoll

```solidity
error NotPoll()
```

### InitTwice

```solidity
error InitTwice()
```

### LibrariesNotLinked

```solidity
error LibrariesNotLinked()
```

### PollDoesNotExist

```solidity
error PollDoesNotExist()
```

### PollNotCompleted

```solidity
error PollNotCompleted()
```

### afterInit

```solidity
modifier afterInit()
```

Modifiers

_allow a function to be called only after the contract has been initialized_

### onlyPoll

```solidity
modifier onlyPoll(uint256 _pollId)
```

_allow a function to be called only by a poll_

### constructor

```solidity
constructor() public payable
```

_Empty constructor which only sets the owner_

### initialize

```solidity
function initialize(address _owner, address _pollFactory, address _vkFactory, address _signUpGatekeeperFactory, address _accQueueFactory, uint256 _signUpPeriod, uint256 _deactivationPeriod, address _topupCredit) external
```

_Initialize the contract_

### deployPoll

```solidity
function deployPoll(address _messageProcessorAddress, uint256 _duration, struct Params.MaxValues _maxValues, struct Params.TreeDepths _treeDepths, struct IPubKey.PubKey _coordinatorPubKey) public
```

Deploy a new Poll contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _messageProcessorAddress | address |  |
| _duration | uint256 | How long should the Poll last for |
| _maxValues | struct Params.MaxValues |  |
| _treeDepths | struct Params.TreeDepths | The depth of the Merkle trees |
| _coordinatorPubKey | struct IPubKey.PubKey |  |

### mergeStateAqSubRoots

```solidity
function mergeStateAqSubRoots(uint256 _numSrQueueOps, uint256 _pollId) public
```

Allow Poll contracts to merge the state subroots

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _numSrQueueOps | uint256 | Number of operations |
| _pollId | uint256 | The active Poll ID |

### mergeStateAq

```solidity
function mergeStateAq(uint256 _pollId) public returns (uint256 root)
```

Allow Poll contracts to merge the state root

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pollId | uint256 | The active Poll ID |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| root | uint256 | The calculated Merkle root |

### getStateAqRoot

```solidity
function getStateAqRoot() external view returns (uint256)
```

Return the main root of the StateAq contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The Merkle root |

### getPoll

```solidity
function getPoll(uint256 _pollId) external view returns (contract IPoll)
```

Get the details of a Poll

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pollId | uint256 | The ID of the poll |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IPoll | Poll The poll |

## Params

This contract holds a number of struct needed for the other contracts

### TreeDepths

```solidity
struct TreeDepths {
  uint8 intStateTreeDepth;
  uint8 messageTreeSubDepth;
  uint8 messageTreeDepth;
  uint8 voteOptionTreeDepth;
}
```

### BatchSizes

```solidity
struct BatchSizes {
  uint24 messageBatchSize;
  uint24 tallyBatchSize;
  uint24 subsidyBatchSize;
}
```

### MaxValues

```solidity
struct MaxValues {
  uint256 maxMessages;
  uint256 maxVoteOptions;
}
```

### ExtContracts

```solidity
struct ExtContracts {
  contract IVkRegistry vkRegistry;
  contract IMaci maci;
  contract IAccQueue messageAq;
  contract IAccQueue deactivatedKeysAq;
  contract ITopupCredit topupCredit;
}
```

## Poll

This contract allows users to submit votes

### deactivationChainHash

```solidity
uint256 deactivationChainHash
```

the hash of the deactivation chain

### isInitialized

```solidity
bool isInitialized
```

track contract initialization
to prevent double initialization

### numMessages

```solidity
uint256 numMessages
```

the number of messages received

### numDeactivatedKeys

```solidity
uint256 numDeactivatedKeys
```

the number of deactivated keys

### numGeneratedKeys

```solidity
uint256 numGeneratedKeys
```

the number of generated keys

### endTime

```solidity
uint256 endTime
```

the duration of the poll

### messageProcessorAddress

```solidity
address messageProcessorAddress
```

the address of the message processor contract

### stateAqMerged

```solidity
bool stateAqMerged
```

Whether the MACI contract's stateAq has been merged by this contract

### mergedStateRoot

```solidity
uint256 mergedStateRoot
```

### currentSbCommitment

```solidity
uint256 currentSbCommitment
```

### extContracts

```solidity
struct Params.ExtContracts extContracts
```

the contracts which this contract relies on

### coordinatorPubKey

```solidity
struct IPubKey.PubKey coordinatorPubKey
```

### batchSizes

```solidity
struct Params.BatchSizes batchSizes
```

### treeDepths

```solidity
struct Params.TreeDepths treeDepths
```

### maxValues

```solidity
struct Params.MaxValues maxValues
```

### PublishedMessage

```solidity
event PublishedMessage(struct IMessage.Message _message, struct IPubKey.PubKey _pubKey)
```

### TopupMessage

```solidity
event TopupMessage(struct IMessage.Message _message)
```

### AttemptedKeyDeactivation

```solidity
event AttemptedKeyDeactivation(struct IMessage.Message _message, struct IPubKey.PubKey _encPubKey)
```

### AttemptedKeyGeneration

```solidity
event AttemptedKeyGeneration(struct IMessage.Message _message, struct IPubKey.PubKey _encPubKey, uint256 _newStateIndex)
```

### MergedMaciStateAq

```solidity
event MergedMaciStateAq(uint256 _mergedStateRoot)
```

### MergedMaciStateAqSubRoots

```solidity
event MergedMaciStateAqSubRoots(uint256 _numSrQueueOps)
```

### MergedMessageAqSubRoots

```solidity
event MergedMessageAqSubRoots(uint256 _numSrQueueOps)
```

### MergedMessageAq

```solidity
event MergedMessageAq(uint256 _mergedMessageRoot)
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### VotingDeadlineExceeded

```solidity
error VotingDeadlineExceeded()
```

### VotingDeadlineNotExceeded

```solidity
error VotingDeadlineNotExceeded()
```

### TooManyMessages

```solidity
error TooManyMessages()
```

### InvalidPubKey

```solidity
error InvalidPubKey()
```

### DeactivationPeriodPassed

```solidity
error DeactivationPeriodPassed()
```

### StateAqAlreadyMerged

```solidity
error StateAqAlreadyMerged()
```

### Unauthorized

```solidity
error Unauthorized()
```

### StateAqSubTreesNotMerged

```solidity
error StateAqSubTreesNotMerged()
```

### isWithinVotingDeadline

```solidity
modifier isWithinVotingDeadline()
```

### isAfterVotingDeadline

```solidity
modifier isAfterVotingDeadline()
```

### constructor

```solidity
constructor() public payable
```

### initialize

```solidity
function initialize(address _owner, address _messageProcessorAddress, uint256 _duration, struct Params.MaxValues _maxValues, struct Params.TreeDepths _treeDepths, struct Params.BatchSizes _batchSizes, struct IPubKey.PubKey _coordinatorPubKey, struct Params.ExtContracts _extContracts) external
```

### topup

```solidity
function topup(uint256 stateIndex, uint256 amount) public
```

Allows to publish a Topup message

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stateIndex | uint256 | The index of user in the state queue |
| amount | uint256 | The amount of credits to topup |

### publishMessage

```solidity
function publishMessage(struct IMessage.Message _message, struct IPubKey.PubKey _encPubKey) public
```

Allows anyone to publish a message (an encrypted command and signature).
This function also enqueues the message.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _message | struct IMessage.Message | The message to publish |
| _encPubKey | struct IPubKey.PubKey | An epheremal public key which can be combined with the     coordinator's private key to generate an ECDH shared key with which     to encrypt the message. |

### deactivateKey

```solidity
function deactivateKey(struct IMessage.Message _message, struct IPubKey.PubKey _encPubKey) external
```

Attempts to deactivate the User's MACI public key

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _message | struct IMessage.Message | The encrypted message which contains state leaf index |
| _encPubKey | struct IPubKey.PubKey | An epheremal public key which can be combined with the     coordinator's private key to generate an ECDH shared key with which     to encrypt the message. |

### generateNewKeyFromDeactivated

```solidity
function generateNewKeyFromDeactivated(struct IMessage.Message _message, struct IPubKey.PubKey _encPubKey) external returns (uint256)
```

Attempts to generate new key from the deactivated one

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _message | struct IMessage.Message | The encrypted message which contains state leaf index |
| _encPubKey | struct IPubKey.PubKey | An epheremal public key which can be combined with the     coordinator's private key to generate an ECDH shared key with which     to encrypt the message. |

### mergeMaciStateAqSubRoots

```solidity
function mergeMaciStateAqSubRoots(uint256 _numSrQueueOps, uint256 _pollId) external
```

The first step of merging the MACI state AccQueue. This allows the
ProcessMessages circuit to access the latest state tree and ballots via
currentSbCommitment.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _numSrQueueOps | uint256 | The number of operations |
| _pollId | uint256 | The poll ID to merge the state for |

### mergeMaciStateAq

```solidity
function mergeMaciStateAq(uint256 _pollId) external
```

The second step of merging the MACI state AccQueue. This allows the
ProcessMessages circuit to access the latest state tree and ballots via
currentSbCommitment.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pollId | uint256 | The ID of the Poll |

### mergeMessageAqSubRoots

```solidity
function mergeMessageAqSubRoots(uint256 _numSrQueueOps) public
```

The first step in merging the message AccQueue so that the
ProcessMessages circuit can access the message root.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _numSrQueueOps | uint256 | The number of operations |

### mergeMessageAq

```solidity
function mergeMessageAq() public
```

The second step in merging the message AccQueue so that the
ProcessMessages circuit can access the message root.

## PollFactory

A contract that can be used to deploy new instances a Poll contract

### pollTemplate

```solidity
address pollTemplate
```

### NewPollDeployed

```solidity
event NewPollDeployed(address _poll)
```

### constructor

```solidity
constructor(address _pollTemplate) public payable
```

### createNewInstance

```solidity
function createNewInstance(address owner, address accQueueFactory, address _messageProcessorAddress, uint256 _duration, struct Params.MaxValues _maxValues, struct Params.TreeDepths _treeDepths, struct Params.BatchSizes _batchSizes, struct IPubKey.PubKey _coordinatorPubKey, address _maci, address _topupCredit) external returns (address clone)
```

Create a new instance of a Poll

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | the address of the owner of the poll |
| accQueueFactory | address |  |
| _messageProcessorAddress | address | address of the message processor contract |
| _duration | uint256 | the duration of the poll |
| _maxValues | struct Params.MaxValues | the max values for the poll |
| _treeDepths | struct Params.TreeDepths | the tree depths for the poll trees |
| _batchSizes | struct Params.BatchSizes | the batch sizes for the poll |
| _coordinatorPubKey | struct IPubKey.PubKey | the coordinator's public key |
| _maci | address | the address of the maci instance |
| _topupCredit | address | the address of the topup credit contract |

## Utilities

### padAndHashMessage

```solidity
function padAndHashMessage(uint256[2] dataToPad, uint256 msgType) public pure returns (struct IMessage.Message, struct IPubKey.PubKey, uint256)
```

### hashMessageAndEncPubKey

```solidity
function hashMessageAndEncPubKey(struct IMessage.Message _message, struct IPubKey.PubKey _encPubKey) public pure returns (uint256)
```

## VkRegistry

### processVks

```solidity
mapping(uint256 => struct SnarkCommon.VerifyingKey) processVks
```

### processVkSet

```solidity
mapping(uint256 => bool) processVkSet
```

### processDeactivationVks

```solidity
mapping(uint256 => struct SnarkCommon.VerifyingKey) processDeactivationVks
```

### processDeactivationVkSet

```solidity
mapping(uint256 => bool) processDeactivationVkSet
```

### tallyVks

```solidity
mapping(uint256 => struct SnarkCommon.VerifyingKey) tallyVks
```

### tallyVkSet

```solidity
mapping(uint256 => bool) tallyVkSet
```

### subsidyVks

```solidity
mapping(uint256 => struct SnarkCommon.VerifyingKey) subsidyVks
```

### subsidyVkSet

```solidity
mapping(uint256 => bool) subsidyVkSet
```

### newKeyGenerationVks

```solidity
mapping(uint256 => struct SnarkCommon.VerifyingKey) newKeyGenerationVks
```

### newKeyGenerationVkSet

```solidity
mapping(uint256 => bool) newKeyGenerationVkSet
```

### isInitialized

```solidity
bool isInitialized
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### ProcessVkSet

```solidity
event ProcessVkSet(uint256 _sig)
```

### ProcessDeactivationVkSet

```solidity
event ProcessDeactivationVkSet(uint256 _sig)
```

### TallyVkSet

```solidity
event TallyVkSet(uint256 _sig)
```

### SubsidyVkSet

```solidity
event SubsidyVkSet(uint256 _sig)
```

### NewKeyGenerationVkSet

```solidity
event NewKeyGenerationVkSet(uint256 _sig)
```

### constructor

```solidity
constructor() public payable
```

### initialize

```solidity
function initialize(address _owner) external
```

Initialize the contract by setting the owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The owner of the contract |

### isProcessVkSet

```solidity
function isProcessVkSet(uint256 _sig) public view returns (bool)
```

_Checks if the process messages verifying key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the process messages verifying key has been set |

### isTallyVkSet

```solidity
function isTallyVkSet(uint256 _sig) public view returns (bool)
```

_Checks if the tally votes verifying key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the tally votes verifying key has been set |

### isSubsidyVkSet

```solidity
function isSubsidyVkSet(uint256 _sig) public view returns (bool)
```

_Checks if the subsidy verifying key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the subsidy verifying key has been set |

### isGenNewKeyGenerationVkSet

```solidity
function isGenNewKeyGenerationVkSet(uint256 _sig) public view returns (bool)
```

_Checks if the generate new key verification key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the generate new key verification key has been set |

### genProcessVkSig

```solidity
function genProcessVkSig(uint256 _stateTreeDepth, uint256 _messageTreeDepth, uint256 _voteOptionTreeDepth, uint256 _messageBatchSize) public pure returns (uint256)
```

_Generates a signature for the process verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _messageTreeDepth | uint256 | The depth of the message tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |
| _messageBatchSize | uint256 | The size of the message batch |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The generated signature |

### genProcessDeactivationVkSig

```solidity
function genProcessDeactivationVkSig(uint256 _stateTreeDepth, uint256 _deactivationTreeDepth) public pure returns (uint256)
```

_Generates a signature for the process deactivation verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _deactivationTreeDepth | uint256 | The depth of the deactivation tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The generated signature |

### genTallyVkSig

```solidity
function genTallyVkSig(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) public pure returns (uint256)
```

_Generates a signature for the tally verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The generated signature |

### genSubsidyVkSig

```solidity
function genSubsidyVkSig(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) public pure returns (uint256)
```

_Generates a signature for the subsidy verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The generated signature |

### genNewKeyGenerationVkSig

```solidity
function genNewKeyGenerationVkSig(uint256 _stateTreeDepth, uint256 _messageTreeDepth) public pure returns (uint256)
```

_Generates a signature for the new key generation verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _messageTreeDepth | uint256 | The depth of the message tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The generated signature |

### setVerifyingKeys

```solidity
function setVerifyingKeys(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _messageTreeDepth, uint256 _voteOptionTreeDepth, uint256 _messageBatchSize, struct SnarkCommon.VerifyingKey _processVk, struct SnarkCommon.VerifyingKey _deactivationVk, struct SnarkCommon.VerifyingKey _tallyVk, struct SnarkCommon.VerifyingKey _newKeyGenerationVk) public
```

_Sets the verifying keys_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _messageTreeDepth | uint256 | The depth of the message tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |
| _messageBatchSize | uint256 | The size of the message batch |
| _processVk | struct SnarkCommon.VerifyingKey | The process verifying key |
| _deactivationVk | struct SnarkCommon.VerifyingKey | The deactivation verifying key |
| _tallyVk | struct SnarkCommon.VerifyingKey | The tally verifying key |
| _newKeyGenerationVk | struct SnarkCommon.VerifyingKey | The new key generation verifying key |

### setSubsidyKeys

```solidity
function setSubsidyKeys(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth, struct SnarkCommon.VerifyingKey _subsidyVk) public
```

_Sets the subsidy keys_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |
| _subsidyVk | struct SnarkCommon.VerifyingKey | The subsidy verifying key |

### hasProcessVk

```solidity
function hasProcessVk(uint256 _stateTreeDepth, uint256 _messageTreeDepth, uint256 _voteOptionTreeDepth, uint256 _messageBatchSize) public view returns (bool)
```

_Checks if the process verifying key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _messageTreeDepth | uint256 | The depth of the message tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |
| _messageBatchSize | uint256 | The size of the message batch |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the process verifying key has been set |

### getProcessVkBySig

```solidity
function getProcessVkBySig(uint256 _sig) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the process verifying key by its signature_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The process verifying key |

### getProcessVk

```solidity
function getProcessVk(uint256 _stateTreeDepth, uint256 _messageTreeDepth, uint256 _voteOptionTreeDepth, uint256 _messageBatchSize) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the process verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _messageTreeDepth | uint256 | The depth of the message tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |
| _messageBatchSize | uint256 | The size of the message batch |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The process verifying key |

### getProcessDeactivationVkBySig

```solidity
function getProcessDeactivationVkBySig(uint256 _sig) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the process deactivation verifying key by its signature_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The process deactivation verifying key |

### getProcessDeactivationVk

```solidity
function getProcessDeactivationVk(uint256 _stateTreeDepth, uint256 _deactivationTreeDepth) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the process deactivation verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _deactivationTreeDepth | uint256 | The depth of the deactivation tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The process deactivation verifying key |

### hasTallyVk

```solidity
function hasTallyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) public view returns (bool)
```

_Checks if the tally verifying key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the tally verifying key has been set |

### getTallyVkBySig

```solidity
function getTallyVkBySig(uint256 _sig) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the tally verifying key by its signature_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The tally verifying key |

### getTallyVk

```solidity
function getTallyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the tally verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The tally verifying key |

### getnewKeyGenerationVkBySig

```solidity
function getnewKeyGenerationVkBySig(uint256 _sig) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the new key generation verifying key by its signature_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The new key generation verifying key |

### getNewKeyGenerationVk

```solidity
function getNewKeyGenerationVk(uint256 _stateTreeDepth, uint256 _messageTreeDepth) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the new key generation verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _messageTreeDepth | uint256 | The depth of the message tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The new key generation verifying key |

### hasSubsidyVk

```solidity
function hasSubsidyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) public view returns (bool)
```

_Checks if the subsidy verifying key has been set_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool indicating if the subsidy verifying key has been set |

### getSubsidyVkBySig

```solidity
function getSubsidyVkBySig(uint256 _sig) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the subsidy verifying key by its signature_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sig | uint256 | The signature of the verifying key |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The subsidy verifying key |

### getSubsidyVk

```solidity
function getSubsidyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) public view returns (struct SnarkCommon.VerifyingKey)
```

_Gets the subsidy verifying key_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stateTreeDepth | uint256 | The depth of the state tree |
| _intStateTreeDepth | uint256 | The depth of the intermediate state tree |
| _voteOptionTreeDepth | uint256 | The depth of the vote option tree |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct SnarkCommon.VerifyingKey | VerifyingKey The subsidy verifying key |

## PoseidonT3

### poseidon

```solidity
function poseidon(uint256[2] input) public pure returns (uint256)
```

## PoseidonT4

### poseidon

```solidity
function poseidon(uint256[3] input) public pure returns (uint256)
```

## PoseidonT5

### poseidon

```solidity
function poseidon(uint256[4] input) public pure returns (uint256)
```

## PoseidonT6

### poseidon

```solidity
function poseidon(uint256[5] input) public pure returns (uint256)
```

## Hasher

### sha256Hash

```solidity
function sha256Hash(uint256[] array) public pure returns (uint256)
```

### hash2

```solidity
function hash2(uint256[2] array) public pure returns (uint256)
```

### hash3

```solidity
function hash3(uint256[3] array) public pure returns (uint256)
```

### hash4

```solidity
function hash4(uint256[4] array) public pure returns (uint256)
```

### hash5

```solidity
function hash5(uint256[5] array) public pure returns (uint256)
```

### hashLeftRight

```solidity
function hashLeftRight(uint256 _left, uint256 _right) public pure returns (uint256)
```

## IAccQueue

IAccQueue is an interface for the AccQueue contracts

### initialize

```solidity
function initialize(uint256 _subDepth, uint256 _hashLength, address _owner) external
```

### getMainRoot

```solidity
function getMainRoot(uint256 _stateTreeDepth) external view returns (uint256)
```

### mergeSubRoots

```solidity
function mergeSubRoots(uint256 _numSrQueueOps) external
```

### merge

```solidity
function merge(uint256 _stateTreeDepth) external returns (uint256)
```

### treeMerged

```solidity
function treeMerged() external returns (bool)
```

### enqueue

```solidity
function enqueue(uint256 _leaf) external returns (uint256)
```

## IAccQueueFactory

IAccQueueFactory is an interface for the AccQueueFactory contract

### accQueueBinary0Template

```solidity
function accQueueBinary0Template() external view returns (address)
```

### accQueueBinaryMaciTemplate

```solidity
function accQueueBinaryMaciTemplate() external view returns (address)
```

### accQueueQuinary0Template

```solidity
function accQueueQuinary0Template() external view returns (address)
```

### accQueueQuinaryMaciTemplate

```solidity
function accQueueQuinaryMaciTemplate() external view returns (address)
```

### accQueueQuinaryBlankSlTemplate

```solidity
function accQueueQuinaryBlankSlTemplate() external view returns (address)
```

### createNewInstanceBinary0

```solidity
function createNewInstanceBinary0(address owner, uint256 _subDepth) external returns (address)
```

### createNewInstanceBinaryMaci

```solidity
function createNewInstanceBinaryMaci(address owner, uint256 _subDepth) external returns (address)
```

### createNewInstanceQuinary0

```solidity
function createNewInstanceQuinary0(address owner, uint256 _subDepth) external returns (address)
```

### createNewInstanceQuinaryMaci

```solidity
function createNewInstanceQuinaryMaci(address owner, uint256 _subDepth) external returns (address)
```

### createNewInstanceQuinaryBlankSl

```solidity
function createNewInstanceQuinaryBlankSl(address owner, uint256 _subDepth) external returns (address)
```

## IMaci

IMaci is the MACI's contract interface

### stateTreeDepth

```solidity
function stateTreeDepth() external view returns (uint8)
```

### vkRegistry

```solidity
function vkRegistry() external view returns (contract VkRegistry)
```

### getStateAqRoot

```solidity
function getStateAqRoot() external view returns (uint256)
```

### mergeStateAqSubRoots

```solidity
function mergeStateAqSubRoots(uint256 _numSrQueueOps, uint256 _pollId) external
```

### mergeStateAq

```solidity
function mergeStateAq(uint256 _pollId) external returns (uint256)
```

### numSignUps

```solidity
function numSignUps() external view returns (uint256)
```

### stateAq

```solidity
function stateAq() external view returns (contract AccQueue)
```

### signUpDeadline

```solidity
function signUpDeadline() external view returns (uint40)
```

### deactivationPeriod

```solidity
function deactivationPeriod() external view returns (uint40)
```

### initialize

```solidity
function initialize(address _messageProcessorAddress, uint256 _duration, uint256 _maxValues, uint256 _treeDepths, uint256 _batchSizes, uint256 _coordinatorPubKey, address _vkRegistry, address _maci, address _topupCredit, address _pollOwner) external
```

## IPoll

IPoll is an interface for the Poll contract

### initialize

```solidity
function initialize(address _owner, address _messageProcessorAddress, uint256 _duration, struct Params.MaxValues _maxValues, struct Params.TreeDepths _treeDepths, struct Params.BatchSizes _batchSizes, struct IPubKey.PubKey _coordinatorPubKey, struct Params.ExtContracts _extContracts) external
```

## IPollFactory

IPollFactory is an interface for the PollFactory contract

### createNewInstance

```solidity
function createNewInstance(address owner, address accQueueFactory, address _messageProcessorAddress, uint256 _duration, struct Params.MaxValues _maxValues, struct Params.TreeDepths _treeDepths, struct Params.BatchSizes _batchSizes, struct IPubKey.PubKey _coordinatorPubKey, address _maci, address _topupCredit) external returns (address clone)
```

## ISignUpGatekeeper

ISignUpGatekeeper is an interface for the SignUpGatekeepers contracts

### initialize

```solidity
function initialize(address, address, address) external
```

### setMaciInstance

```solidity
function setMaciInstance(address) external
```

### register

```solidity
function register(address, bytes) external
```

## ISignUpGatekeeperFactory

ISignUpGatekeeperFactory is an interface for the SignUpGatekeeperFactory contract

### createNewInstance

```solidity
function createNewInstance(address _owner, address _token, address _maci) external returns (address clone)
```

## ITopupCredit

ITopupCredit is an interface for the TopupCredit contract

### MAXIMUM_AIRDROP_AMOUNT

```solidity
function MAXIMUM_AIRDROP_AMOUNT() external view returns (uint256)
```

### airdropTo

```solidity
function airdropTo(address account, uint256 amount) external
```

### airdrop

```solidity
function airdrop(uint256 amount) external
```

### transferFrom

```solidity
function transferFrom(address sender, address recipient, uint256 amount) external
```

## IVkRegistry

IVkRegistry is an interface for the VkRegistry contract

### isProcessVkSet

```solidity
function isProcessVkSet(uint256 _sig) external view returns (bool)
```

### initialize

```solidity
function initialize(address _owner) external
```

### setVerifyingKeys

```solidity
function setVerifyingKeys(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _messageTreeDepth, uint256 _voteOptionTreeDepth, uint256 _messageBatchSize, struct SnarkCommon.VerifyingKey _processVk, struct SnarkCommon.VerifyingKey _deactivationVk, struct SnarkCommon.VerifyingKey _tallyVk, struct SnarkCommon.VerifyingKey _newKeyGenerationVk) external
```

### setSubsidyKeys

```solidity
function setSubsidyKeys(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth, struct SnarkCommon.VerifyingKey _subsidyVk) external
```

### getnewKeyGenerationVkBySig

```solidity
function getnewKeyGenerationVkBySig(uint256 _sig) external view returns (struct SnarkCommon.VerifyingKey)
```

### getNewKeyGenerationVk

```solidity
function getNewKeyGenerationVk(uint256 _stateTreeDepth, uint256 _messageTreeDepth) external view returns (struct SnarkCommon.VerifyingKey)
```

### hasSubsidyVk

```solidity
function hasSubsidyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) external view returns (bool)
```

### getSubsidyVkBySig

```solidity
function getSubsidyVkBySig(uint256 _sig) external view returns (struct SnarkCommon.VerifyingKey)
```

### getSubsidyVk

```solidity
function getSubsidyVk(uint256 _stateTreeDepth, uint256 _intStateTreeDepth, uint256 _voteOptionTreeDepth) external view returns (struct SnarkCommon.VerifyingKey)
```

## IVkRegistryFactory

IVkRegistryFactory is an interface for the VkRegistryFactory contract

### createNewInstance

```solidity
function createNewInstance(address _owner) external returns (address clone)
```

## AccQueue

### MAX_DEPTH

```solidity
uint256 MAX_DEPTH
```

### Queue

```solidity
struct Queue {
  uint256[4][33] levels;
  uint256[33] indices;
}
```

### subDepth

```solidity
uint256 subDepth
```

### hashLength

```solidity
uint256 hashLength
```

### subTreeCapacity

```solidity
uint256 subTreeCapacity
```

### isBinary

```solidity
bool isBinary
```

### currentSubtreeIndex

```solidity
uint256 currentSubtreeIndex
```

### leafQueue

```solidity
struct AccQueue.Queue leafQueue
```

### subRootQueue

```solidity
struct AccQueue.Queue subRootQueue
```

### subRoots

```solidity
mapping(uint256 => uint256) subRoots
```

### mainRoots

```solidity
uint256[33] mainRoots
```

### subTreesMerged

```solidity
bool subTreesMerged
```

### treeMerged

```solidity
bool treeMerged
```

### smallSRTroot

```solidity
uint256 smallSRTroot
```

### nextSubRootIndex

```solidity
uint256 nextSubRootIndex
```

### numLeaves

```solidity
uint256 numLeaves
```

### isInitialized

```solidity
bool isInitialized
```

whether the contract was initialized or not

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

custom errors

### HashLengthNotSupported

```solidity
error HashLengthNotSupported()
```

### SubDepthTooLarge

```solidity
error SubDepthTooLarge()
```

### SubDepthTooSmall

```solidity
error SubDepthTooSmall()
```

### SubTreesAlreadyMerged

```solidity
error SubTreesAlreadyMerged()
```

### NothingToMerge

```solidity
error NothingToMerge()
```

### DepthTooSmall

```solidity
error DepthTooSmall()
```

### DepthTooLarge

```solidity
error DepthTooLarge()
```

### SubTreesNotMerged

```solidity
error SubTreesNotMerged()
```

### DepthSmallerThenSrt

```solidity
error DepthSmallerThenSrt()
```

### IndexDoesNotExist

```solidity
error IndexDoesNotExist()
```

### constructor

```solidity
constructor() internal payable
```

### initialize

```solidity
function initialize(uint256 _subDepth, uint256 _hashLength, address _owner) external
```

Initializes the contract (to be used with clones)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _subDepth | uint256 | The depth of each subtree. |
| _hashLength | uint256 | The number of elements per hash operation. Should be                   either 2 (for binary trees) or 5 (quinary trees). |
| _owner | address | The owner of the contract. |

### hashLevel

```solidity
function hashLevel(uint256 _level, uint256 _leaf) internal virtual returns (uint256)
```

Hash the contents of the specified level and the specified leaf.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which require
different input array lengths.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The level to hash. |
| _leaf | uint256 | The leaf include with the level. |

### hashLevelLeaf

```solidity
function hashLevelLeaf(uint256 _level, uint256 _leaf) public view virtual returns (uint256)
```

### getZero

```solidity
function getZero(uint256 _level) internal virtual returns (uint256)
```

Returns the zero leaf at a specified level.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which will produce
different zero values (e.g. hashLeftRight(0, 0) vs
hash5([0, 0, 0, 0, 0]). Moreover, the zero value may be a
nothing-up-my-sleeve value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The specified level |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The zero leaf at the specified level. |

### enqueue

```solidity
function enqueue(uint256 _leaf) public returns (uint256)
```

Add a leaf to the queue for the current subtree.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _leaf | uint256 | The leaf to add. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The index of the leaf. |

### _enqueue

```solidity
function _enqueue(uint256 _leaf, uint256 _level) internal
```

Updates the queue at a given level and hashes any subroots that need to
be hashed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _leaf | uint256 | The leaf to add. |
| _level | uint256 | The level at which to queue the leaf. |

### fill

```solidity
function fill() public
```

Fill any empty leaves of the current subtree with zeros and store the
resulting subroot.

### _fill

```solidity
function _fill(uint256 _level) internal virtual
```

A function that queues zeros to the specified level, hashes,
the level, and enqueues the hash to the next level.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The level at which to queue zeros. |

### insertSubTree

```solidity
function insertSubTree(uint256 _subRoot) public
```

Insert a subtree. Used for batch enqueues.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _subRoot | uint256 | The subroot to insert. |

### calcMinHeight

```solidity
function calcMinHeight() public view returns (uint256)
```

Calculate the lowest possible height of a tree with all the subroots
merged together.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The height of the tree. |

### mergeSubRoots

```solidity
function mergeSubRoots(uint256 _numSrQueueOps) public
```

Merge all subtrees to form the shortest possible tree.
This function can be called either once to merge all subtrees in a
single transaction, or multiple times to do the same in multiple
transactions. If _numSrQueueOps is set to 0, this function will attempt
to merge all subtrees in one go. If it is set to a number greater than
0, it will perform up to that number of queueSubRoot() operations.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _numSrQueueOps | uint256 | The number of times this function will call                       queueSubRoot(), up to the maximum number of times                       is necessary. If it is set to 0, it will call                       queueSubRoot() as many times as is necessary. Set                       this to a low number and call this function                       multiple times if there are many subroots to                       merge, or a single transaction would run out of                       gas. |

### queueSubRoot

```solidity
function queueSubRoot(uint256 _leaf, uint256 _level, uint256 _maxDepth) internal
```

### merge

```solidity
function merge(uint256 _depth) public returns (uint256)
```

### getSubRoot

```solidity
function getSubRoot(uint256 _index) public view returns (uint256)
```

### getSmallSRTroot

```solidity
function getSmallSRTroot() public view returns (uint256)
```

### getMainRoot

```solidity
function getMainRoot(uint256 _depth) public view returns (uint256)
```

### getSrIndices

```solidity
function getSrIndices() public view returns (uint256, uint256)
```

## AccQueueBinary

### constructor

```solidity
constructor() internal payable
```

### hashLevel

```solidity
function hashLevel(uint256 _level, uint256 _leaf) internal returns (uint256)
```

Hash the contents of the specified level and the specified leaf.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which require
different input array lengths.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The level to hash. |
| _leaf | uint256 | The leaf include with the level. |

### hashLevelLeaf

```solidity
function hashLevelLeaf(uint256 _level, uint256 _leaf) public view returns (uint256)
```

### _fill

```solidity
function _fill(uint256 _level) internal
```

A function that queues zeros to the specified level, hashes,
the level, and enqueues the hash to the next level.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The level at which to queue zeros. |

## AccQueueQuinary

### constructor

```solidity
constructor() internal payable
```

### hashLevel

```solidity
function hashLevel(uint256 _level, uint256 _leaf) internal returns (uint256)
```

Hash the contents of the specified level and the specified leaf.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which require
different input array lengths.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The level to hash. |
| _leaf | uint256 | The leaf include with the level. |

### hashLevelLeaf

```solidity
function hashLevelLeaf(uint256 _level, uint256 _leaf) public view returns (uint256)
```

### _fill

```solidity
function _fill(uint256 _level) internal
```

A function that queues zeros to the specified level, hashes,
the level, and enqueues the hash to the next level.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The level at which to queue zeros. |

## AccQueueBinary0

### constructor

```solidity
constructor() public payable
```

### getZero

```solidity
function getZero(uint256 _level) internal view returns (uint256)
```

Returns the zero leaf at a specified level.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which will produce
different zero values (e.g. hashLeftRight(0, 0) vs
hash5([0, 0, 0, 0, 0]). Moreover, the zero value may be a
nothing-up-my-sleeve value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The specified level |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The zero leaf at the specified level. |

## AccQueueBinaryMaci

### constructor

```solidity
constructor() public payable
```

### getZero

```solidity
function getZero(uint256 _level) internal view returns (uint256)
```

Returns the zero leaf at a specified level.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which will produce
different zero values (e.g. hashLeftRight(0, 0) vs
hash5([0, 0, 0, 0, 0]). Moreover, the zero value may be a
nothing-up-my-sleeve value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The specified level |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The zero leaf at the specified level. |

## AccQueueQuinary0

### constructor

```solidity
constructor() public payable
```

### getZero

```solidity
function getZero(uint256 _level) internal view returns (uint256)
```

Returns the zero leaf at a specified level.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which will produce
different zero values (e.g. hashLeftRight(0, 0) vs
hash5([0, 0, 0, 0, 0]). Moreover, the zero value may be a
nothing-up-my-sleeve value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The specified level |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The zero leaf at the specified level. |

## AccQueueQuinaryMaci

### constructor

```solidity
constructor() public payable
```

### getZero

```solidity
function getZero(uint256 _level) internal view returns (uint256)
```

Returns the zero leaf at a specified level.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which will produce
different zero values (e.g. hashLeftRight(0, 0) vs
hash5([0, 0, 0, 0, 0]). Moreover, the zero value may be a
nothing-up-my-sleeve value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The specified level |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The zero leaf at the specified level. |

## AccQueueQuinaryBlankSl

### constructor

```solidity
constructor() public payable
```

### getZero

```solidity
function getZero(uint256 _level) internal view returns (uint256)
```

Returns the zero leaf at a specified level.
This is a virtual function as the hash function which the overriding
contract uses will be either hashLeftRight or hash5, which will produce
different zero values (e.g. hashLeftRight(0, 0) vs
hash5([0, 0, 0, 0, 0]). Moreover, the zero value may be a
nothing-up-my-sleeve value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _level | uint256 | The specified level |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The zero leaf at the specified level. |

## EmptyBallotRoots

### emptyBallotRoots

```solidity
uint256[5] emptyBallotRoots
```

### constructor

```solidity
constructor() internal
```

## MerkleZeros

### zeros

```solidity
uint256[33] zeros
```

### constructor

```solidity
constructor() internal
```

## MerkleZeros

### zeros

```solidity
uint256[33] zeros
```

### constructor

```solidity
constructor() internal
```

## MerkleZeros

### zeros

```solidity
uint256[33] zeros
```

### constructor

```solidity
constructor() internal
```

## MerkleZeros

### zeros

```solidity
uint256[33] zeros
```

### constructor

```solidity
constructor() internal
```

## MerkleZeros

### zeros

```solidity
uint256[33] zeros
```

### constructor

```solidity
constructor() internal
```

## MerkleZeros

### zeros

```solidity
uint256[33] zeros
```

### constructor

```solidity
constructor() internal
```

## InitialVoiceCreditProxy

An abstract contract for the InitialVoiceCreditProxy implementations

### getVoiceCredits

```solidity
function getVoiceCredits(address _user, bytes _data) public view virtual returns (uint256)
```

## AccQueueFactory

AccQueueFactory is a contract that can be used to deploy new AccQueue instances
using the Clones library

### accQueueBinary0Template

```solidity
address accQueueBinary0Template
```

store the templates as immutable variables

### accQueueBinaryMaciTemplate

```solidity
address accQueueBinaryMaciTemplate
```

### accQueueQuinary0Template

```solidity
address accQueueQuinary0Template
```

### accQueueQuinaryMaciTemplate

```solidity
address accQueueQuinaryMaciTemplate
```

### accQueueQuinaryBlankSlTemplate

```solidity
address accQueueQuinaryBlankSlTemplate
```

### NewAccQueueBinary0Deployed

```solidity
event NewAccQueueBinary0Deployed(address _accQueue)
```

the events to differentiate between which contracts are deployed

### NewAccQueueBinaryMaciDeployed

```solidity
event NewAccQueueBinaryMaciDeployed(address _accQueue)
```

### NewAccQueueQuinary0Deployed

```solidity
event NewAccQueueQuinary0Deployed(address _accQueue)
```

### NewAccQueueQuinaryMaciDeployed

```solidity
event NewAccQueueQuinaryMaciDeployed(address _accQueue)
```

### NewAccQueueQuinaryBlankSlDeployed

```solidity
event NewAccQueueQuinaryBlankSlDeployed(address _accQueue)
```

### constructor

```solidity
constructor(address _accQueueBinary0Template, address _accQueueBinaryMaciTemplate, address _accQueueQuinary0Template, address _accQueueQuinaryMaciTemplate, address _accQueueQuinaryBlankSlTemplate) public payable
```

the constructor sets the templates

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accQueueBinary0Template | address | The address of the AccQueueBinary0 template |
| _accQueueBinaryMaciTemplate | address | The address of the AccQueueBinaryMaci template |
| _accQueueQuinary0Template | address | The address of the AccQueueQuinary0 template |
| _accQueueQuinaryMaciTemplate | address | The address of the AccQueueQuinaryMaci template |
| _accQueueQuinaryBlankSlTemplate | address | The address of the AccQueueQuinaryBlankSl template |

### createNewInstanceBinary0

```solidity
function createNewInstanceBinary0(address owner, uint256 _subDepth) public returns (address clone)
```

createNewInstance deploys a new AccQueueBinary0 instance using the Clones library

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

### createNewInstanceBinaryMaci

```solidity
function createNewInstanceBinaryMaci(address owner, uint256 _subDepth) public returns (address clone)
```

createNewInstance deploys a new AccQueueBinaryMaci instance using the Clones library

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

### createNewInstanceQuinary0

```solidity
function createNewInstanceQuinary0(address owner, uint256 _subDepth) public returns (address clone)
```

createNewInstance deploys a new AccQueueQuinary0 instance using the Clones library

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

### createNewInstanceQuinaryMaci

```solidity
function createNewInstanceQuinaryMaci(address owner, uint256 _subDepth) public returns (address clone)
```

createNewInstance deploys a new AccQueueQuinaryMaci instance using the Clones library

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

### createNewInstanceQuinaryBlankSl

```solidity
function createNewInstanceQuinaryBlankSl(address owner, uint256 _subDepth) public returns (address clone)
```

createNewInstance deploys a new AccQueueQuinaryBlankSl instance using the Clones library

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

## MaciFactory

MaciFactory is a contract that can be used to deploy new MACI instances
using the Clones library

### maciTemplate

```solidity
address maciTemplate
```

### NewMaciDepoyed

```solidity
event NewMaciDepoyed(address _maci)
```

### constructor

```solidity
constructor(address _maciTemplate) public payable
```

### createNewInstance

```solidity
function createNewInstance(address _messageProcessorAddress, uint256 _duration, uint256 _maxValues, uint256 _treeDepths, uint256 _batchSizes, uint256 _coordinatorPubKey, address _vkRegistry, address _maci, address _topupCredit, address _pollOwner) public returns (address clone)
```

## TopupCredit

### MAXIMUM_AIRDROP_AMOUNT

```solidity
uint256 MAXIMUM_AIRDROP_AMOUNT
```

### constructor

```solidity
constructor() public
```

### airdropTo

```solidity
function airdropTo(address account, uint256 amount) public
```

### airdrop

```solidity
function airdrop(uint256 amount) public
```

## IOwned

IOwned is a wrapper for contracts that implement Owned

### transferOwnership

```solidity
function transferOwnership(address _owner) external
```

## SignUpTokenFactory

SignUpTokenFactory is a contract that can be used to deploy new SignUpToken instances
using the Clones library

### signUpTokenFactoryTemplate

```solidity
address signUpTokenFactoryTemplate
```

### NewSignUpGatekeeperDeployed

```solidity
event NewSignUpGatekeeperDeployed(address _signUpTokenFactoryTemplate)
```

### constructor

```solidity
constructor(address _signUpTokenFactoryTemplate) public payable
```

### createNewInstance

```solidity
function createNewInstance(address _owner, string name, string symbol) public returns (address clone)
```

_createNewInstance deploys a new SignUpToken instance using the Clones library_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

## ISignUpToken

ISignUpToken is an interface for the SignUpToken contracts

### initialize

```solidity
function initialize(address _owner, string _name, string _symbol) external
```

### ownerOf

```solidity
function ownerOf(uint256 tokenId) external view returns (address)
```

## SignUpGatekeeperFactory

SignUpGatekeeperFactory is a contract that can be used to deploy new SignUpGatekeeper instances
using the Clones library

### signUpGatekeeperInstanceTemplate

```solidity
address signUpGatekeeperInstanceTemplate
```

### NewSignUpTokenDeployed

```solidity
event NewSignUpTokenDeployed(address _signUpGatekeeperInstance)
```

### constructor

```solidity
constructor(address _signUpGatekeeperInstanceTemplate) public payable
```

### createNewInstance

```solidity
function createNewInstance(address _owner, address _tokenAddress, address _maciAddress) public returns (address clone)
```

_createNewInstance deploys a new SignUpGatekeeper instance using the Clones library_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The owner of the contract |
| _tokenAddress | address | The address of the token contract |
| _maciAddress | address | The address of the MACI contract |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

## VkRegistryFactory

VkRegistryFactory is a contract that can be used to deploy new VkRegistry instances
using the Clones library

### vkRegistryTemplate

```solidity
address vkRegistryTemplate
```

### NewVkRegistryDeployed

```solidity
event NewVkRegistryDeployed(address _vkRegistry)
```

### constructor

```solidity
constructor(address _vkRegistryTemplate) public payable
```

### createNewInstance

```solidity
function createNewInstance() public returns (address clone)
```

_createNewInstance deploys a new VkRegistry instance using the Clones library_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| clone | address | address |

## SignUpGatekeeper

An abstract contract for MACI gatekeepers
Use this to implement your own gatekeeper

### setMaciInstance

```solidity
function setMaciInstance(address _maci) public virtual
```

### register

```solidity
function register(address _user, bytes _data) public virtual
```

## SignUpTokenGatekeeper

An implementation of MACI gatekeeper that ensures that only 
users with a certain token (ERC721) can sign up

### token

```solidity
contract ISignUpToken token
```

### maci

```solidity
address maci
```

### registeredTokenIds

```solidity
mapping(uint256 => bool) registeredTokenIds
```

### isInitialized

```solidity
bool isInitialized
```

whether it's init or not

### OnlyMaci

```solidity
error OnlyMaci()
```

errors

### NotTokenOwner

```solidity
error NotTokenOwner()
```

### AlreadySignedUp

```solidity
error AlreadySignedUp()
```

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

### constructor

```solidity
constructor() public payable
```

### initialize

```solidity
function initialize(address _owner, address _token, address _maci) external
```

Initializes the contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | The owner of the contract |
| _token | address | The address of the token that is required to sign up |
| _maci | address | The address of the MACI instance |

### setMaciInstance

```solidity
function setMaciInstance(address _maci) public
```

Adds an uninitialised MACI instance to allow for token singups

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maci | address | The MACI contract interface to be stored |

### register

```solidity
function register(address _user, bytes _data) public
```

Registers the user if they own the token with the token ID encoded in
_data. Throws if the user is does not own the token or if the token has
already been used to sign up.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | The user's Ethereum address. |
| _data | bytes | The ABI-encoded tokenId as a uint256. |

## SignUpToken

### tokenId

```solidity
uint256 tokenId
```

### constructor

```solidity
constructor(string name, string symbol) public payable
```

### giveToken

```solidity
function giveToken(address to) public
```

### tokenURI

```solidity
function tokenURI(uint256 id) public view returns (string)
```

## FreeForAllGatekeeper

A gatekeeper that allows anyone to register

### setMaciInstance

```solidity
function setMaciInstance(address _maci) public
```

### register

```solidity
function register(address, bytes) public
```

