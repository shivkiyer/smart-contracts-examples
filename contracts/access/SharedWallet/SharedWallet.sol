// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Contract for creating a shared wallet for approved withdrawers.
 *
 * The contract owner can add and remove withdrawers.
 * An attempt to withdraw over the set limit will revert with an error.
 * An attempt by an unauthorized person to withdraw will revert with an error.
 */
contract SharedWallet is Ownable, AccessControl {
    bytes32 public constant SPENDER = keccak256("SPENDER");
    uint256 private withdrawLimit;
    uint256 private balance;

    event SharedWallet__Withdrawal(
        address indexed _from,
        address indexed _to,
        uint256 amount
    );
    event SharedWallet__UpdateLimit(address indexed _from, uint256 limit);

    error SharedWallet__ExceededLimit(uint256 requestedAmount, uint256 limit);
    error SharedWallet__InsufficientBalance(uint256 requestedAmount);

    constructor(
        uint256 _withdrawLimit,
        address _walletOwner
    ) Ownable(_walletOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, _walletOwner);
        withdrawLimit = _withdrawLimit;
    }

    receive() external payable {
        balance += msg.value;
    }

    function getWithdrawalLimit() public view returns (uint256) {
        return withdrawLimit;
    }

    function updateWithdrawalLimit(uint256 _newLimit) public onlyOwner {
        emit SharedWallet__UpdateLimit(address(this), _newLimit);
        withdrawLimit = _newLimit;
    }

    function setWithdrawers(address[] memory _withdrawers) public onlyOwner {
        uint256 noOfWithdrawers = _withdrawers.length;
        for (uint256 i = 0; i < noOfWithdrawers; i++) {
            grantRole(SPENDER, _withdrawers[i]);
        }
    }

    function removeWithDrawers(address[] memory _withdrawers) public onlyOwner {
        uint256 noOfWithdrawers = _withdrawers.length;
        for (uint256 i = 0; i < noOfWithdrawers; i++) {
            revokeRole(SPENDER, _withdrawers[i]);
        }
    }

    function isWithdrawer(address _account) public view returns (bool) {
        return hasRole(SPENDER, _account);
    }

    function withdraw(uint256 amount) public onlyRole(SPENDER) {
        address _to = _msgSender();
        if (amount > withdrawLimit) {
            revert SharedWallet__ExceededLimit({
                requestedAmount: amount,
                limit: withdrawLimit
            });
        }
        if (amount > balance) {
            revert SharedWallet__InsufficientBalance(amount);
        }
        balance -= amount;
        payable(_to).transfer(amount);
        emit SharedWallet__Withdrawal(address(this), _to, amount);
    }

    function closeWallet() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
