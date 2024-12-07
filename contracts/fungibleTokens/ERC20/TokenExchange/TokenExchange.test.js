const { ethers } = require('hardhat');

describe('TokenExchange', () => {
  let owner, seller1, buyer1;
  let testContract;

  beforeEach(async () => {
    [owner, seller1, buyer1] = await ethers.getSigners();

    testContract = await ethers.deployContract('TokenExchange', [
      'TestExchange',
      'TST',
      100000,
    ]);
  });

  it('should create a token exchange with specified number of tokens held by contract owner', async () => {
    const checkSupply = await testContract.totalSupply();
    expect(checkSupply.toString()).toBe('100000');
    const checkOwnerBalance = await testContract.balanceOf(owner.address);
    expect(checkOwnerBalance.toString()).toBe('100000');
  });

  it('should allow a transfer of tokens from one account to another', async () => {
    await testContract.transfer(seller1, 10000);

    const checkSeller1Balance = await testContract.balanceOf(seller1.address);
    expect(checkSeller1Balance.toString()).toBe('10000');
    const checkOwnerBalance = await testContract.balanceOf(owner.address);
    expect(checkOwnerBalance.toString()).toBe('90000');
  });

  it('should allow an account to put up tokens for sale', async () => {
    await testContract.transfer(seller1, 20000);

    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(5000, valueInWei);

    const checkOffer = await testContract.querySellerValue(seller1.address);
    expect(checkOffer.toString()).toBe('5000');
    const checkOfferPrice = await testContract.querySellerPrice(
      seller1.address
    );
    const checkOfferPriceEther = ethers.formatUnits(checkOfferPrice, 'ether');
    expect(checkOfferPriceEther.toString()).toBe('0.05');
    const checkSellerList = await testContract.querySellers();
    expect(checkSellerList).toContain(seller1.address);
  });

  it('should allow a buyer to buy tokens from a listed seller', async () => {
    await testContract.transfer(seller1, 20000);

    const initalSellerAccountBalance = await ethers.provider.getBalance(
      seller1
    );
    const initalBuyerAccountBalance = await ethers.provider.getBalance(buyer1);
    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(5000, valueInWei);

    const buyValueInWei = ethers.parseEther('5');
    await testContract
      .connect(buyer1)
      .buy(seller1.address, 100, { value: buyValueInWei });

    const checkSellerBalance = await testContract.balanceOf(seller1.address);
    expect(checkSellerBalance.toString()).toBe('19900');
    const checkSellerAvailableSales = await testContract.querySellerValue(
      seller1.address
    );
    expect(checkSellerAvailableSales.toString()).toBe('4900');

    const checkBuyersBalance = await testContract.balanceOf(buyer1.address);
    expect(checkBuyersBalance.toString()).toBe('100');

    const finalSellerAccountBalance = await ethers.provider.getBalance(seller1);
    const finalBuyerAccountBalance = await ethers.provider.getBalance(buyer1);

    expect(
      Number(
        ethers.formatUnits(
          (finalSellerAccountBalance - initalSellerAccountBalance).toString(),
          'ether'
        )
      )
    ).toBeGreaterThan(4.97);
    expect(
      Number(
        ethers.formatUnits(
          (initalBuyerAccountBalance - finalBuyerAccountBalance).toString(),
          'ether'
        )
      )
    ).toBeGreaterThan(4.97);
  });

  it('should revert with error if seller tries to sell excess tokens than in balance', async () => {
    let result = null;
    await testContract.transfer(seller1, 10000);

    const valueInWei = ethers.parseEther('0.05');
    try {
      await testContract.connect(seller1).sell(10001, valueInWei);
    } catch (e) {
      result = e;
    }

    expect(result).not.toBe(null);
  });

  it('should revert with an error if buyer tries to buy excess tokens than on sale', async () => {
    let result = null;
    await testContract.transfer(seller1, 20000);

    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(100, valueInWei);

    const buyValueInWei = ethers.parseEther('5.05');

    try {
      await testContract
        .connect(buyer1)
        .buy(seller1, 101, { value: buyValueInWei });
    } catch (e) {
      result = e;
    }
    expect(result).not.toBe(null);
  });

  it('should revert with an error if buyer sends lesser ether for purchase', async () => {
    let result = null;
    await testContract.transfer(seller1, 20000);

    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(110, valueInWei);

    const buyValueInWei = ethers.parseEther('4.99');

    try {
      await testContract
        .connect(buyer1)
        .buy(seller1, 100, { value: buyValueInWei });
    } catch (e) {
      result = e;
    }
    expect(result).not.toBe(null);
  });

  it('should refund excess Ether sent by buyer after processing amount for tokens', async () => {
    await testContract.transfer(seller1, 20000);

    const initalBuyerAccountBalance = await ethers.provider.getBalance(buyer1);
    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(5000, valueInWei);

    const buyValueInWei = ethers.parseEther('8');
    await testContract
      .connect(buyer1)
      .buy(seller1.address, 100, { value: buyValueInWei });

    const finalBuyerAccountBalance = await ethers.provider.getBalance(buyer1);

    expect(
      Number(
        ethers.formatUnits(
          (initalBuyerAccountBalance - finalBuyerAccountBalance).toString(),
          'ether'
        )
      )
    ).toBeGreaterThan(4.95);
    expect(
      Number(
        ethers.formatUnits(
          (initalBuyerAccountBalance - finalBuyerAccountBalance).toString(),
          'ether'
        )
      )
    ).toBeLessThan(5.05);
  });

  it('should allow a seller to reduce the number of tokens for sale', async () => {
    await testContract.transfer(seller1, 20000);

    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(5000, valueInWei);

    let checkValueForSale = await testContract
      .connect(buyer1)
      .querySellerValue(seller1.address);
    expect(checkValueForSale.toString()).toBe('5000');

    await testContract.connect(seller1).retractSale(2000);

    checkValueForSale = await testContract
      .connect(buyer1)
      .querySellerValue(seller1.address);
    expect(checkValueForSale.toString()).toBe('3000');
  });

  it('should allow a seller to add more tokens for sale', async () => {
    await testContract.transfer(seller1, 20000);

    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(5000, valueInWei);

    let checkValueForSale = await testContract
      .connect(buyer1)
      .querySellerValue(seller1.address);
    expect(checkValueForSale.toString()).toBe('5000');

    await testContract.connect(seller1).sell(2000, valueInWei);

    checkValueForSale = await testContract
      .connect(buyer1)
      .querySellerValue(seller1.address);
    expect(checkValueForSale.toString()).toBe('7000');
  });

  it('should allow a seller to update the price of tokens for sale', async () => {
    await testContract.transfer(seller1, 20000);

    const valueInWei = ethers.parseEther('0.05');
    await testContract.connect(seller1).sell(5000, valueInWei);

    let checkPriceForSale = await testContract
      .connect(buyer1)
      .querySellerPrice(seller1.address);
    expect(ethers.formatUnits(checkPriceForSale, 'ether')).toBe('0.05');

    const updatedValueInWei = ethers.parseEther('0.03');
    await testContract.connect(seller1).sell(0, updatedValueInWei);

    checkPriceForSale = await testContract
      .connect(buyer1)
      .querySellerPrice(seller1.address);
    expect(ethers.formatUnits(checkPriceForSale, 'ether')).toBe('0.03');
  });
});
