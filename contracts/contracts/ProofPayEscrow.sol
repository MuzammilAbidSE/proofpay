// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofPayEscrow
/// @notice Milestone-based escrow. The contract itself is the custodian of
/// funds; the backend only ever reads state via events, it never moves money.
contract ProofPayEscrow {
    enum MilestoneStatus {
        Pending,
        Submitted,
        Approved,
        Released,
        Disputed,
        Refunded
    }

    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
        bytes32 proofHash;
    }

    struct Escrow {
        address client;
        address freelancer;
        address arbitrator;
        uint256 balance; // deposited funds not yet released or refunded
    }

    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => Milestone[]) public milestones;

    bool private locked;

    event EscrowCreated(uint256 indexed escrowId, address indexed client, address indexed freelancer, address arbitrator);
    event Deposited(uint256 indexed escrowId, address indexed from, uint256 amount);
    event MilestoneAdded(uint256 indexed escrowId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneSubmitted(uint256 indexed escrowId, uint256 indexed milestoneId, bytes32 proofHash);
    event MilestoneApproved(uint256 indexed escrowId, uint256 indexed milestoneId);
    event PaymentReleased(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed to, uint256 amount);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed openedBy);
    event Refunded(uint256 indexed escrowId, uint256 indexed milestoneId, address indexed to, uint256 amount);

    modifier nonReentrant() {
        require(!locked, "reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyClient(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].client, "not client");
        _;
    }

    modifier onlyFreelancer(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].freelancer, "not freelancer");
        _;
    }

    modifier onlyArbitrator(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].arbitrator, "not arbitrator");
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(escrows[escrowId].client != address(0), "escrow does not exist");
        _;
    }

    function createEscrow(address freelancer, address arbitrator) external returns (uint256 escrowId) {
        require(freelancer != address(0), "freelancer required");
        require(arbitrator != address(0), "arbitrator required");

        escrowId = nextEscrowId++;
        escrows[escrowId] = Escrow({
            client: msg.sender,
            freelancer: freelancer,
            arbitrator: arbitrator,
            balance: 0
        });

        emit EscrowCreated(escrowId, msg.sender, freelancer, arbitrator);
    }

    function deposit(uint256 escrowId) external payable escrowExists(escrowId) onlyClient(escrowId) {
        require(msg.value > 0, "deposit must be > 0");
        escrows[escrowId].balance += msg.value;
        emit Deposited(escrowId, msg.sender, msg.value);
    }

    function addMilestone(uint256 escrowId, uint256 amount)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        returns (uint256 milestoneId)
    {
        require(amount > 0, "amount must be > 0");
        milestones[escrowId].push(Milestone({amount: amount, status: MilestoneStatus.Pending, proofHash: bytes32(0)}));
        milestoneId = milestones[escrowId].length - 1;
        emit MilestoneAdded(escrowId, milestoneId, amount);
    }

    function submitMilestone(uint256 escrowId, uint256 milestoneId, bytes32 proofHash)
        external
        escrowExists(escrowId)
        onlyFreelancer(escrowId)
    {
        Milestone storage milestone = _milestone(escrowId, milestoneId);
        require(milestone.status == MilestoneStatus.Pending, "milestone not pending");

        milestone.status = MilestoneStatus.Submitted;
        milestone.proofHash = proofHash;
        emit MilestoneSubmitted(escrowId, milestoneId, proofHash);
    }

    function approveMilestone(uint256 escrowId, uint256 milestoneId)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
    {
        Milestone storage milestone = _milestone(escrowId, milestoneId);
        require(milestone.status == MilestoneStatus.Submitted, "milestone not submitted");

        milestone.status = MilestoneStatus.Approved;
        emit MilestoneApproved(escrowId, milestoneId);
    }

    /// @notice Pays the freelancer. Callable by anyone once a milestone is
    /// Approved; callable by the arbitrator to resolve a Disputed milestone
    /// in the freelancer's favor.
    function releasePayment(uint256 escrowId, uint256 milestoneId) external escrowExists(escrowId) nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = _milestone(escrowId, milestoneId);

        if (milestone.status == MilestoneStatus.Disputed) {
            require(msg.sender == escrow.arbitrator, "only arbitrator resolves dispute");
        } else {
            require(milestone.status == MilestoneStatus.Approved, "milestone not approved");
        }

        require(escrow.balance >= milestone.amount, "insufficient escrow balance");

        uint256 amount = milestone.amount;
        milestone.status = MilestoneStatus.Released;
        escrow.balance -= amount;

        (bool success, ) = payable(escrow.freelancer).call{value: amount}("");
        require(success, "transfer to freelancer failed");

        emit PaymentReleased(escrowId, milestoneId, escrow.freelancer, amount);
    }

    function openDispute(uint256 escrowId, uint256 milestoneId) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.client || msg.sender == escrow.freelancer, "not a party to escrow");

        Milestone storage milestone = _milestone(escrowId, milestoneId);
        require(
            milestone.status == MilestoneStatus.Submitted || milestone.status == MilestoneStatus.Approved,
            "milestone cannot be disputed"
        );

        milestone.status = MilestoneStatus.Disputed;
        emit DisputeOpened(escrowId, milestoneId, msg.sender);
    }

    /// @notice Resolves a dispute in the client's favor by returning funds.
    function refund(uint256 escrowId, uint256 milestoneId)
        external
        escrowExists(escrowId)
        onlyArbitrator(escrowId)
        nonReentrant
    {
        Escrow storage escrow = escrows[escrowId];
        Milestone storage milestone = _milestone(escrowId, milestoneId);
        require(milestone.status == MilestoneStatus.Disputed, "milestone not disputed");
        require(escrow.balance >= milestone.amount, "insufficient escrow balance");

        uint256 amount = milestone.amount;
        milestone.status = MilestoneStatus.Refunded;
        escrow.balance -= amount;

        (bool success, ) = payable(escrow.client).call{value: amount}("");
        require(success, "refund to client failed");

        emit Refunded(escrowId, milestoneId, escrow.client, amount);
    }

    function getMilestones(uint256 escrowId) external view returns (Milestone[] memory) {
        return milestones[escrowId];
    }

    function milestoneCount(uint256 escrowId) external view returns (uint256) {
        return milestones[escrowId].length;
    }

    function _milestone(uint256 escrowId, uint256 milestoneId) private view returns (Milestone storage) {
        require(milestoneId < milestones[escrowId].length, "milestone does not exist");
        return milestones[escrowId][milestoneId];
    }
}
