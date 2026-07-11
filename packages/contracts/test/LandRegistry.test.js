const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BaseLandRegistry", function () {
  let registry;
  let admin;
  let registrar;
  let owner;
  let newOwner;
  let outsider;

  beforeEach(async function () {
    [admin, registrar, owner, newOwner, outsider] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("BaseLandRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
    await registry.connect(admin).setRegistrar(registrar.address, true);
  });

  it("allows a registrar to register land and prevents duplicate registration", async function () {
    await expect(
      registry.connect(registrar).registerLand(1, owner.address, "SUR-001", "Pune", 1200)
    )
      .to.emit(registry, "LandRegistered")
      .withArgs(1, owner.address, "SUR-001", "Pune", 1200);

    await expect(
      registry.connect(registrar).registerLand(1, owner.address, "SUR-001", "Pune", 1200)
    ).to.be.revertedWith("BaseLandRegistry: duplicate land registration");
  });

  it("restricts registration and transfer approval to registrars", async function () {
    await expect(
      registry.connect(outsider).registerLand(1, owner.address, "SUR-001", "Pune", 1200)
    ).to.be.revertedWith("BaseLandRegistry: caller is not registrar");

    await registry.connect(registrar).registerLand(1, owner.address, "SUR-001", "Pune", 1200);
    await registry.connect(owner).requestTransfer(1, newOwner.address);

    await expect(registry.connect(outsider).approveTransfer(1)).to.be.revertedWith(
      "BaseLandRegistry: caller is not registrar"
    );
  });

  it("executes the full approved ownership transfer workflow and stores history", async function () {
    await registry.connect(registrar).registerLand(1, owner.address, "SUR-001", "Pune", 1200);

    await expect(registry.connect(owner).requestTransfer(1, newOwner.address))
      .to.emit(registry, "TransferRequested")
      .withArgs(1, owner.address, newOwner.address);

    await expect(registry.connect(registrar).approveTransfer(1))
      .to.emit(registry, "TransferApproved")
      .withArgs(1, registrar.address, newOwner.address);

    await expect(registry.connect(newOwner).transferOwnership(1))
      .to.emit(registry, "OwnershipTransferred")
      .withArgs(1, owner.address, newOwner.address);

    const details = await registry.getLandDetails.staticCall(1);
    expect(details.id).to.equal(1);
    expect(details.surveyNumber).to.equal("SUR-001");
    expect(details.location).to.equal("Pune");
    expect(details.area).to.equal(1200);
    expect(details.currentOwner).to.equal(newOwner.address);
    expect(details.pendingOwner).to.equal(ethers.ZeroAddress);
    expect(details.transferStatus).to.equal(0);
    expect(details.ownershipHistory).to.deep.equal([owner.address, newOwner.address]);
  });

  it("blocks invalid transfer attempts", async function () {
    await registry.connect(registrar).registerLand(1, owner.address, "SUR-001", "Pune", 1200);

    await expect(registry.connect(outsider).requestTransfer(1, newOwner.address)).to.be.revertedWith(
      "BaseLandRegistry: caller is not owner"
    );

    await registry.connect(owner).requestTransfer(1, newOwner.address);

    await expect(registry.connect(newOwner).transferOwnership(1)).to.be.revertedWith(
      "BaseLandRegistry: transfer not approved"
    );
  });
});

describe("OptimizedLandRegistry", function () {
  let registry;
  let admin;
  let registrar;
  let owner;
  let newOwner;
  let outsider;
  let metadataHash;

  beforeEach(async function () {
    [admin, registrar, owner, newOwner, outsider] = await ethers.getSigners();
    metadataHash = ethers.keccak256(ethers.toUtf8Bytes("SUR-001|Pune|1200"));

    const Registry = await ethers.getContractFactory("OptimizedLandRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
    await registry.connect(admin).setRegistrar(registrar.address, true);
  });

  it("allows compact land registration and prevents duplicates", async function () {
    await expect(registry.connect(registrar).registerLand(1, owner.address, metadataHash, 1200))
      .to.emit(registry, "LandRegistered")
      .withArgs(1, owner.address, metadataHash, 1200);

    await expect(
      registry.connect(registrar).registerLand(1, owner.address, metadataHash, 1200)
    ).to.be.revertedWithCustomError(registry, "DuplicateRegistration");
  });

  it("enforces registrar role with custom errors", async function () {
    await expect(
      registry.connect(outsider).registerLand(1, owner.address, metadataHash, 1200)
    ).to.be.revertedWithCustomError(registry, "NotRegistrar");

    await registry.connect(registrar).registerLand(1, owner.address, metadataHash, 1200);
    await registry.connect(owner).requestTransfer(1, newOwner.address);

    await expect(registry.connect(outsider).approveTransfer(1)).to.be.revertedWithCustomError(
      registry,
      "NotRegistrar"
    );
  });

  it("executes the optimized transfer workflow and stores ownership history", async function () {
    await registry.connect(registrar).registerLand(1, owner.address, metadataHash, 1200);

    await expect(registry.connect(owner).requestTransfer(1, newOwner.address))
      .to.emit(registry, "TransferRequested")
      .withArgs(1, owner.address, newOwner.address);

    await expect(registry.connect(registrar).approveTransfer(1))
      .to.emit(registry, "TransferApproved")
      .withArgs(1, registrar.address, newOwner.address);

    await expect(registry.connect(newOwner).transferOwnership(1))
      .to.emit(registry, "OwnershipTransferred")
      .withArgs(1, owner.address, newOwner.address);

    const details = await registry.getLandDetails.staticCall(1);
    expect(details.currentOwner).to.equal(newOwner.address);
    expect(details.area).to.equal(1200);
    expect(details.metadataHash).to.equal(metadataHash);
    expect(details.pendingOwner).to.equal(ethers.ZeroAddress);
    expect(details.transferStatus).to.equal(0);
    expect(details.ownershipHistory).to.deep.equal([owner.address, newOwner.address]);
  });

  it("blocks invalid optimized transfer attempts", async function () {
    await registry.connect(registrar).registerLand(1, owner.address, metadataHash, 1200);

    await expect(registry.connect(outsider).requestTransfer(1, newOwner.address))
      .to.be.revertedWithCustomError(registry, "NotCurrentOwner");

    await registry.connect(owner).requestTransfer(1, newOwner.address);

    await expect(registry.connect(newOwner).transferOwnership(1))
      .to.be.revertedWithCustomError(registry, "TransferNotApproved");
  });
});
