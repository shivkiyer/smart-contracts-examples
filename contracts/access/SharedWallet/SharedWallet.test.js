const { ethers } = require('hardhat');

describe('SharedWallet.sol', () => {
  let owner, testUser1, testUser2;
  let testContract;

  beforeEach(async () => {
    [owner, testUser1, testUser2, testUser3] = await ethers.getSigners();

    const withDrawalLimit = 2.5;
    const withDrawalLimitWei = ethers.parseEther(withDrawalLimit.toString());

    testContract = await ethers.deployContract('SharedWallet', [
      withDrawalLimitWei,
      owner.address,
    ]);
  });

  it('should deploy the contract with the correct owner', async () => {
    expect(testContract.target).not.toBe(null);
    const testContractOwner = await testContract.owner();
    expect(testContractOwner).toBe(owner.address);
  });

  it('should be able to update the withdrawal limit', async () => {
    const initialLimit = await testContract.getWithdrawalLimit();
    expect(initialLimit).toBe(ethers.parseEther('2.5'));

    const newLimit = ethers.parseEther('4.75');
    await testContract.updateWithdrawalLimit(newLimit);

    const verifyNewLimit = await testContract.getWithdrawalLimit();
    expect(verifyNewLimit).toBe(newLimit);
  });

  it('should not allow a user other than contract owner to update withdrawal limit', async () => {
    const newLimit = ethers.parseEther('4.75');
    let result = null;
    try {
      await testContract.connect(testUser1).updateWithdrawalLimit(newLimit);
    } catch (e) {
      result = e;
    }
    expect(result).not.toBe(null);
  });

  it('should allow owner to set withdrawers for wallet', async () => {
    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    let result;

    result = await testContract.isWithdrawer(testUser1.address);
    expect(result).toBe(true);
    result = await testContract.isWithdrawer(testUser2.address);
    expect(result).toBe(true);
    result = await testContract.isWithdrawer(testUser3.address);
    expect(result).toBe(false);
  });

  it('should ensure only owner can set withdrawers for the wallet', async () => {
    let result = null;

    try {
      await testContract
        .connect(testUser3)
        .setWithdrawers([testUser1.address, testUser2.address]);
    } catch (e) {
      result = e;
    }

    expect(result).not.toBe(null);
  });

  it('should allow deposit of Ether in the contract', async () => {
    const contractAddress = await testContract.getAddress();
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('10'),
    });

    const checkBalance = await ethers.provider.getBalance(testContract);
    const checkBalanceEther = ethers.formatUnits(checkBalance, 'ether');
    expect(Number(checkBalanceEther)).toBe(10);
  });

  it('should allow an authorized withdawer to withdraw Ether', async () => {
    const contractAddress = await testContract.getAddress();
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('10'),
    });

    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    const initialUserBalance = await ethers.provider.getBalance(testUser1);

    const withDrawAmount = ethers.parseEther('2');
    const withdrawResult = await testContract
      .connect(testUser1)
      .withdraw(withDrawAmount);

    const contractBalance = await ethers.provider.getBalance(testContract);
    const finalUserBalance = await ethers.provider.getBalance(testUser1);

    const userBalanceIncrease =
      Number(ethers.formatUnits(finalUserBalance, 'ether')) -
      Number(ethers.formatUnits(initialUserBalance, 'ether'));
    expect(Number(ethers.formatUnits(contractBalance, 'ether'))).toBe(8);
    expect(userBalanceIncrease).toBeGreaterThan(1.95);
  });

  it('should revert with an error if unauthorized user attempts to withdraw Ether', async () => {
    const contractAddress = await testContract.getAddress();
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('10'),
    });

    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    const withDrawAmount = ethers.parseEther('2');

    let result;
    try {
      result = await testContract.connect(testUser3).withdraw(withDrawAmount);
    } catch (e) {
      result = null;
    }
    expect(result).toBe(null);
  });

  it('should revert with an error if withdrawal amount is greater than limit', async () => {
    const contractAddress = await testContract.getAddress();
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('10'),
    });

    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    const withDrawAmount = ethers.parseEther('3');

    let result;
    try {
      result = await testContract.connect(testUser2).withdraw(withDrawAmount);
    } catch (e) {
      result = null;
    }
    expect(result).toBe(null);
  });

  it('should revert with an error if withdrawal amount is greater than contract balance', async () => {
    const contractAddress = await testContract.getAddress();
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('1.5'),
    });

    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    const withDrawAmount = ethers.parseEther('2');

    let result;
    try {
      result = await testContract.connect(testUser2).withdraw(withDrawAmount);
    } catch (e) {
      result = null;
    }
    expect(result).toBe(null);
  });

  it('should enable the contract owner to remove withdrawers', async () => {
    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    let checkWithdrawer = await testContract.isWithdrawer(testUser1.address);
    expect(checkWithdrawer).toBe(true);

    const result = await testContract.removeWithDrawers([testUser1.address]);

    checkWithdrawer = await testContract.isWithdrawer(testUser1.address);
    expect(checkWithdrawer).toBe(false);

    checkWithdrawer = await testContract.isWithdrawer(testUser2.address);
    expect(checkWithdrawer).toBe(true);
  });

  it('should allow only the contract owner to remove withdrawers', async () => {
    await testContract.setWithdrawers([testUser1.address, testUser2.address]);

    let checkWithdrawer = await testContract.isWithdrawer(testUser1.address);
    expect(checkWithdrawer).toBe(true);

    let result;

    try {
      await testContract
        .connect(testUser3)
        .removeWithDrawers([testUser1.address]);
      result = null;
    } catch (e) {
      result = e;
    }

    expect(result).not.toBe(null);
  });
});
