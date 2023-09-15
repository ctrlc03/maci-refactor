// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IAccQueueFactory
 * @author PSE
 * @notice IAccQueueFactory is an interface for the AccQueueFactory contract
 */
interface IAccQueueFactory {
    function accQueueBinary0Template() external view returns (address);
    function accQueueBinaryMaciTemplate() external view returns (address);
    function accQueueQuinary0Template() external view returns (address);
    function accQueueQuinaryMaciTemplate() external view returns (address);
    function accQueueQuinaryBlankSlTemplate() external view returns (address);

    function createNewInstanceBinary0(address owner, uint256 _subDepth) external returns (address);
    function createNewInstanceBinaryMaci(address owner, uint256 _subDepth) external returns (address);
    function createNewInstanceQuinary0(address owner, uint256 _subDepth) external returns (address);
    function createNewInstanceQuinaryMaci(address owner, uint256 _subDepth) external returns (address);
    function createNewInstanceQuinaryBlankSl(address owner, uint256 _subDepth) external returns (address);
}
