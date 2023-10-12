// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ISignUpToken
 * @author PSE
 * @notice ISignUpToken is an interface for the SignUpToken contracts
 */
interface ISignUpToken {
    function initialize(
        address _owner,
        string memory _name,
        string memory _symbol
    ) external;
    function ownerOf(
        uint256 tokenId
    ) external view returns (address);
}
