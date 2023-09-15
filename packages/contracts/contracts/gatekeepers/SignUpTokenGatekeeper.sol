// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Owned } from "solmate/src/auth/Owned.sol";

import { SignUpGatekeeper } from './SignUpGatekeeper.sol';
import { ISignUpToken } from '../interfaces/ISignUpToken.sol';

/**
 * @title SignUpTokenGatekeeper
 * @author PSE
 * @notice An implementation of MACI gatekeeper that ensures that only 
 * users with a certain token (ERC721) can sign up
 */
contract SignUpTokenGatekeeper is SignUpGatekeeper, Owned {

    // The address of the token that is required to sign up
    ISignUpToken public token;
    // The address of the MACI instance
    address public maci;

    // A mapping of token IDs to whether they have been used to sign up
    mapping (uint256 => bool) public registeredTokenIds;

    /// @notice whether it's init or not
    bool public isInitialized;

    /// @notice errors
    error OnlyMaci();
    error NotTokenOwner();
    error AlreadySignedUp();
    error AlreadyInitialized();

    constructor() payable Owned(msg.sender) {}

    /**
     * Initializes the contract
     * @param _owner The owner of the contract
     * @param _token The address of the token that is required to sign up
     * @param _maci The address of the MACI instance
     */
    function initialize(
        address _owner,
        address _token, 
        address _maci
    ) external {
        if (isInitialized) revert AlreadyInitialized();
        isInitialized = true;

        /// @notice overwrite the owner
        owner = _owner;
        /// @notice store the token
        token = ISignUpToken(_token);
        /// @notice store the maci address
        maci = _maci;
    }

    /**
     * Adds an uninitialised MACI instance to allow for token singups
     * @param _maci The MACI contract interface to be stored
     */
    function setMaciInstance(address _maci) public onlyOwner override {
        maci = _maci;
    }

    /**
     * Registers the user if they own the token with the token ID encoded in
     * _data. Throws if the user is does not own the token or if the token has
     * already been used to sign up.
     * @param _user The user's Ethereum address.
     * @param _data The ABI-encoded tokenId as a uint256.
     */
    function register(address _user, bytes memory _data) public override {
        if (msg.sender != maci) revert OnlyMaci();

        // Decode the given _data bytes into a uint256 which is the token ID
        uint256 tokenId = abi.decode(_data, (uint256));

        // Check if the user owns the token
        if (token.ownerOf(tokenId) != _user) revert NotTokenOwner();

        // Check if the token has already been used
        if (registeredTokenIds[tokenId]) revert AlreadySignedUp();

        // Mark the token as already used
        registeredTokenIds[tokenId] = true;
    }
}
