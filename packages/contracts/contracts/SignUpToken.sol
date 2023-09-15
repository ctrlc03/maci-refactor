// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ERC721 } from "solmate/src/tokens/ERC721.sol";
import { Owned } from "solmate/src/auth/Owned.sol";

contract SignUpToken is ERC721, Owned {

    uint256 public tokenId;

    bool public isInitialized;

    error AlreadyInitialized();

    constructor() payable ERC721("SignUpToken", "SignUpToken") Owned(msg.sender) {}

    function initialize(string memory _name, string memory _symbol, address _owner) external {
        if (isInitialized) revert AlreadyInitialized();
        isInitialized = true;
        
        name = _name;
        symbol = _symbol;
        owner = _owner;
    }

    // Gives an ERC721 token to an address
    function giveToken(address to) public onlyOwner {
        uint256 _tokenId = tokenId;
        unchecked {
            tokenId++;
        }
        _mint(to, _tokenId);        
    }

    function tokenURI(uint256 id) public view override returns (string memory) {}
}
