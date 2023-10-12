// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ITopupCredit
 * @author PSE
 * @notice ITopupCredit is an interface for the TopupCredit contract
 */
interface ITopupCredit {
    function MAXIMUM_AIRDROP_AMOUNT() external view returns (uint256);

    function airdropTo(address account, uint256 amount) external;

    function airdrop(uint256 amount) external;

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external;
}