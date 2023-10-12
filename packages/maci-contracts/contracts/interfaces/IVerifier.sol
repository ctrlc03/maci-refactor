// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SnarkCommon } from "../crypto/SnarkCommon.sol";

/**
 * @title IVerifier
 * @author PSE
 * @notice IVerifier is the Verifier's contract interface
 */
interface IVerifier {
    function verify(
        uint256[8] memory _proof,
        SnarkCommon.VerifyingKey memory vk,
        uint256 input
    ) external view returns (bool);
}
