const { ethers } = require('hardhat');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

describe('BenefitsWallet', () => {
  let controller, testUser1, testUser2;
  let testContract;

  beforeEach(async () => {
    [controller, testUser1, testUser2] = await ethers.getSigners();

    const contractStartDate = new Date();
    contractStartDate.setFullYear(contractStartDate.getFullYear() + 1);
    const contractInterval = 365 * 24 * 60 * 60; // 1 year

    const contractEndDate = new Date();
    contractEndDate.setFullYear(contractEndDate.getFullYear() + 20);

    testContract = await ethers.deployContract('BenefitsWallet', [
      testUser1.address,
      contractStartDate.getTime(),
      contractInterval,
      contractEndDate.getTime(),
    ]);

    const contractAddress = await testContract.getAddress();
    await controller.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('10'),
    });
  });

  it('should deploy contract with correct controller and beneficiary (owner)', async () => {
    const testOwner = await testContract.owner();
    const testController = await testContract.controller();
    expect(testOwner).toBe(testUser1.address);
    expect(testController).toBe(controller.address);
  });

  it('should return releasable funds only after intervals', async () => {
    let checkRelease = await testContract.releasable();
    expect(Number(checkRelease)).toBe(0);

    const newDate = new Date();
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth();
    newDate.setFullYear(newYear + 1);
    newDate.setMonth(newMonth + 1);
    await helpers.time.increaseTo(newDate.getTime());

    checkRelease = await testContract.releasable();
    expect(Number(checkRelease)).toBeGreaterThan(0);
  });

  it('should allow only the beneficiary to withdraw funds', async () => {
    let result = null;
    try {
      await testContract.connect(testUser2).release();
    } catch (e) {
      result = e;
    }
    expect(result).not.toBe(null);
  });

  it('should allow the beneficiary to withdraw funds after interval and increment the interval', async () => {
    const initialBalance = await ethers.provider.getBalance(testContract);

    const newDate = new Date();
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth();
    newDate.setFullYear(newYear + 1);
    newDate.setMonth(newMonth + 1);
    await helpers.time.increaseTo(newDate.getTime());

    await testContract.connect(testUser1).release();

    const finalBalance = await ethers.provider.getBalance(testContract);
    expect(finalBalance).toBeLessThan(initialBalance);

    let checkRelease = await testContract.releasable();
    expect(Number(checkRelease)).toBe(0);
  });

  it('should allow the beneficiary to withdraw funds at the expiry of every interval', async () => {
    const initialBalance = await ethers.provider.getBalance(testContract);

    let newDate = new Date();
    let newYear = newDate.getFullYear();
    let newMonth = newDate.getMonth();
    newDate.setFullYear(newYear + 1);
    newDate.setMonth(newMonth + 1);
    await helpers.time.increaseTo(newDate.getTime());

    await testContract.connect(testUser1).release();

    const finalBalance1 = await ethers.provider.getBalance(testContract);
    expect(finalBalance1).toBeLessThan(initialBalance);

    newDate.setFullYear(newYear + 2);
    newDate.setMonth(newMonth + 2);
    await helpers.time.increaseTo(newDate.getTime());

    await testContract.connect(testUser1).release();

    const finalBalance2 = await ethers.provider.getBalance(testContract);
    expect(finalBalance2).toBeLessThan(finalBalance1);
  });

  it('should allow only the owner to close the contract', async () => {
    result = null;

    try {
      await testContract.connect(testUser1).close();
    } catch (e) {
      result = e;
    }

    expect(result).not.toBe(null);
  });

  it('should allow the owner to close the contract and transfer the balance to the owner account', async () => {
    const initialOwnerBalance = await ethers.provider.getBalance(controller);
    await testContract.connect(controller).close();

    const checkBalance = await ethers.provider.getBalance(testContract);
    expect(Number(checkBalance)).toBe(0);

    const finalOwnerBalance = await ethers.provider.getBalance(controller);
    expect(finalOwnerBalance).toBeGreaterThan(initialOwnerBalance);
  });
});
