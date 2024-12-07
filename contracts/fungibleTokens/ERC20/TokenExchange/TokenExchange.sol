// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev A TokenExchange based on ERC20 tokens that facilitates buy/sell of tokens.
 *
 * Besides the transfer, approve and transferFrom functionalities that allow the
 * the transfer of tokens from one account to another, this smart contract creates
 * an exchange where sellers of tokens can list the tokens they are wishing to sell
 * and at what price. Buyers can buy tokens from this exchange by calling a payable
 * function which transfers tokens to them, and the ether to the seller.
 *
 * This opens up the possibility of bidding where sellers can adjust prices to achieve
 * sales.
 *
 */
contract TokenExchange is ERC20 {
    struct TokenOffering {
        uint256 value;
        uint256 price;
    }

    mapping(address => TokenOffering) private _tokenSale;

    address[] private _tokenSellers;

    event TokenExchange__TokenOffering(
        address _seller,
        uint256 _value,
        uint256 _price
    );

    error TokenExchange__InsufficientTokensForSale(
        address _seller,
        uint256 _saleValue
    );
    error TokenExchange__InsufficientPayment(
        address _buyer,
        uint256 _value,
        uint256 _price
    );
    error TokenExchange__ExcessiveTokenRemit(address _seller, uint256 _value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supply
    ) ERC20(_name, _symbol) {
        _mint(_msgSender(), _supply);
    }

    /**
     * @dev Seller places a number of tokens up for sale at a price
     *
     * Will create a new entry for the seller or update the existing offering.
     * Can also be used to update the price of existing tokens on sale without
     * adding more tokens to the offering.
     *
     */
    function sell(uint256 _value, uint256 _price) public {
        address _seller = _msgSender();

        if (balanceOf(_seller) < _value) {
            revert TokenExchange__InsufficientTokensForSale(_seller, _value);
        }

        if (_tokenSale[_seller].value != 0) {
            _tokenSale[_seller].value += _value;
            _tokenSale[_seller].price = _price;
        } else {
            TokenOffering memory _offer = TokenOffering(_value, _price);
            _tokenSale[_seller] = _offer;
        }
        _tokenSellers.push(_seller);
        emit TokenExchange__TokenOffering(_seller, _value, _price);
    }

    /**
     * @dev Seller reduces the number of tokens up for sale
     */
    function retractSale(uint256 _value) public {
        address _seller = _msgSender();

        if (_tokenSale[_seller].value < _value) {
            revert TokenExchange__ExcessiveTokenRemit(_seller, _value);
        }

        _tokenSale[_seller].value -= _value;
    }

    /**
     * @dev Returns an array of token sellers
     */
    function querySellers() public view returns (address[] memory) {
        return _tokenSellers;
    }

    /**
     * @dev Returns the number of tokens on sale by a seller
     */
    function querySellerValue(address _seller) public view returns (uint256) {
        return _tokenSale[_seller].value;
    }

    /**
     * @dev Returns the price of tokens on sale by a seller
     */
    function querySellerPrice(address _seller) public view returns (uint256) {
        return _tokenSale[_seller].price;
    }

    /**
     * A buyer can buy a certain number tokens from a seller at a price
     *
     * The ether transferred to the function will be transferred to the
     * seller, and the tokens transferred from the seller to the buyer.
     *
     */
    function buy(address _seller, uint256 _value) public payable {
        uint256 _amount = msg.value;
        uint256 _saleAmount = _tokenSale[_seller].price * _value;
        address _buyer = _msgSender();

        if (_value > _tokenSale[_seller].value) {
            revert TokenExchange__InsufficientTokensForSale(_seller, _value);
        }

        if (_amount < _saleAmount) {
            revert TokenExchange__InsufficientPayment(
                _buyer,
                _value,
                _tokenSale[_seller].price
            );
        }

        _tokenSale[_seller].value -= _value;
        _transfer(_seller, _buyer, _value);
        payable(_seller).transfer(_saleAmount);
        if (_amount > _saleAmount) {
            payable(_buyer).transfer(_amount - _saleAmount);
        }
    }
}
