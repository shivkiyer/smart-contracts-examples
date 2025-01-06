// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";

/**
 * @dev Contract that can be used by companies for providing loyalty bonuses
 *
 * While creating the contract, the company needs to specify the start, the duration,
 * the interval. With regular deposits made to the contract, the beneficiary can
 * withdraw funds at the end of every interval.
 *
 * An example is a company setting up a 20 year benefits package with an interval of
 * 2 years. At the end of every 2 years, the employee can withdraw proportionate funds
 * from the wallet as a form of bonus. The contract will be closed by the employer
 * when the employee leaves the company.
 *
 */
contract BenefitsWallet is VestingWallet {
    address private _controller;
    uint64 private _intervalSeconds;
    uint64 private _intervalCounter;

    constructor(
        address beneficiary,
        uint64 startTimestamp,
        uint64 interval,
        uint64 durationSeconds
    ) VestingWallet(beneficiary, startTimestamp, durationSeconds) {
        _controller = _msgSender();
        _intervalSeconds = interval;
        _intervalCounter = 1;
    }

    modifier onlyController() {
        if (_msgSender() != _controller) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
        _;
    }

    function _vestingSchedule(
        uint256 totalAllocation,
        uint64 timestamp
    ) internal view virtual override returns (uint256) {
        if (timestamp > (start() + _intervalCounter * _intervalSeconds)) {
            return super._vestingSchedule(totalAllocation, timestamp);
        }
        return 0;
    }

    function controller() public view returns (address) {
        return _controller;
    }

    function intervalCounter() public view returns (uint64) {
        return _intervalCounter;
    }

    function intervalSeconds() public view returns (uint64) {
        return _intervalSeconds;
    }

    function release() public virtual override onlyOwner {
        _intervalCounter += 1;
        super.release();
    }

    function close() public onlyController {
        Address.sendValue(payable(_controller), address(this).balance);
    }
}
