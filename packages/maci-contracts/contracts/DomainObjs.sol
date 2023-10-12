// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Hasher } from "./crypto/Hasher.sol";

contract IPubKey {
    struct PubKey {
        uint256 x;
        uint256 y;
    }
}

contract IMessage {
    uint8 constant MESSAGE_DATA_LENGTH = 10;

    struct Message {
        uint256 msgType; // 1: vote message (size 10), deactivate key (size 10); 2: topup message (size 2); 3: generate new key (size 10);
        uint256[MESSAGE_DATA_LENGTH] data; // data length is padded to size 10
    }
}

contract DomainObjs is IMessage, Hasher, IPubKey {
    struct StateLeaf {
        PubKey pubKey;
        uint256 voiceCreditBalance;
        uint256 timestamp;
    }

    function hashStateLeaf(StateLeaf memory _stateLeaf)
        public
        pure
        returns (uint256)
    {
        uint256[4] memory plaintext;
        plaintext[0] = _stateLeaf.pubKey.x;
        plaintext[1] = _stateLeaf.pubKey.y;
        plaintext[2] = _stateLeaf.voiceCreditBalance;
        plaintext[3] = _stateLeaf.timestamp;

        return hash4(plaintext);
    }
}
