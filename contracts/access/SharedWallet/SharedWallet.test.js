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
});
