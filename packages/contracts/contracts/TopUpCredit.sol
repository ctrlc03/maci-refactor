// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { Owned } from "solmate/src/auth/Owned.sol";

contract TopupCredit is ERC20, Owned {
    uint256 public immutable MAXIMUM_AIRDROP_AMOUNT;

    constructor() ERC20("TopupCredit", "TopupCredit", 1) Owned(msg.sender) {
        MAXIMUM_AIRDROP_AMOUNT = 100000 * 10 ** decimals;
    }

    function airdropTo(address account, uint256 amount) public onlyOwner {
        require(amount < MAXIMUM_AIRDROP_AMOUNT);
        _mint(account, amount);
    }

    function airdrop(uint256 amount) public onlyOwner {
        require(amount < MAXIMUM_AIRDROP_AMOUNT, "amount exceed maximum limit");
        _mint(msg.sender, amount);
    }
}
