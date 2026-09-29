require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(x => x.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true
}));
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function roles(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}

async function audit(userId, action, entityType, entityId, details = {}) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, details }
  });
}

function baseAllowed(user, baseId) {
  return user.role === "ADMIN" || Number(user.baseId) === Number(baseId);
}

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign(
    { id: user.id, role: user.role, baseId: user.baseId },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, baseId: user.baseId }
  });
});

app.get("/api/bases", auth, async (_, res) => {
  res.json(await prisma.base.findMany({ orderBy: { name: "asc" } }));
});

app.get("/api/equipment-types", auth, async (_, res) => {
  res.json(await prisma.equipmentType.findMany({ orderBy: { name: "asc" } }));
});

app.post("/api/purchases", auth, roles("ADMIN", "LOGISTICS_OFFICER"), async (req, res) => {
  const { baseId, equipmentTypeId, quantity, purchaseDate } = req.body;
  if (!baseAllowed(req.user, baseId)) return res.status(403).json({ message: "Base access denied" });
  const purchase = await prisma.purchase.create({
    data: {
      baseId: Number(baseId),
      equipmentTypeId: Number(equipmentTypeId),
      quantity: Number(quantity),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      createdBy: req.user.id
    }
  });
  await audit(req.user.id, "PURCHASE_CREATED", "Purchase", purchase.id, purchase);
  res.status(201).json(purchase);
});

app.get("/api/purchases", auth, async (req, res) => {
  const where = {};
  if (req.query.baseId) where.baseId = Number(req.query.baseId);
  if (req.query.equipmentTypeId) where.equipmentTypeId = Number(req.query.equipmentTypeId);
  if (req.user.role === "BASE_COMMANDER") where.baseId = req.user.baseId;
  const rows = await prisma.purchase.findMany({
    where,
    include: { base: true, equipmentType: true },
    orderBy: { purchaseDate: "desc" }
  });
  res.json(rows);
});

app.post("/api/transfers", auth, roles("ADMIN", "LOGISTICS_OFFICER"), async (req, res) => {
  const { fromBaseId, toBaseId, equipmentTypeId, quantity } = req.body;
  if (!baseAllowed(req.user, fromBaseId)) return res.status(403).json({ message: "Base access denied" });
  if (Number(fromBaseId) === Number(toBaseId)) return res.status(400).json({ message: "Bases must differ" });

  const transfer = await prisma.$transaction(async (tx) => {
    const item = await tx.transfer.create({
      data: {
        fromBaseId: Number(fromBaseId),
        toBaseId: Number(toBaseId),
        equipmentTypeId: Number(equipmentTypeId),
        quantity: Number(quantity),
        createdBy: req.user.id
      }
    });
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: "TRANSFER_CREATED",
        entityType: "Transfer",
        entityId: item.id,
        details: { fromBaseId, toBaseId, equipmentTypeId, quantity }
      }
    });
    return item;
  });
  res.status(201).json(transfer);
});

app.get("/api/transfers", auth, async (req, res) => {
  const where = req.user.role === "BASE_COMMANDER"
    ? { OR: [{ fromBaseId: req.user.baseId }, { toBaseId: req.user.baseId }] }
    : {};
  const rows = await prisma.transfer.findMany({
    where,
    include: { fromBase: true, toBase: true, equipmentType: true },
    orderBy: { transferDate: "desc" }
  });
  res.json(rows);
});

app.post("/api/assignments", auth, async (req, res) => {
  const { baseId, equipmentTypeId, assignedTo, quantity } = req.body;
  if (!baseAllowed(req.user, baseId)) return res.status(403).json({ message: "Base access denied" });
  const item = await prisma.assignment.create({
    data: { baseId: Number(baseId), equipmentTypeId: Number(equipmentTypeId), assignedTo, quantity: Number(quantity), createdBy: req.user.id }
  });
  await audit(req.user.id, "ASSIGNMENT_CREATED", "Assignment", item.id, item);
  res.status(201).json(item);
});

app.get("/api/assignments", auth, async (req, res) => {
  const where = req.user.role === "BASE_COMMANDER" ? { baseId: req.user.baseId } : {};
  res.json(await prisma.assignment.findMany({
    where,
    include: { base: true, equipmentType: true },
    orderBy: { assignedDate: "desc" }
  }));
});

app.post("/api/expenditures", auth, async (req, res) => {
  const { baseId, equipmentTypeId, quantity } = req.body;
  if (!baseAllowed(req.user, baseId)) return res.status(403).json({ message: "Base access denied" });
  const item = await prisma.expenditure.create({
    data: { baseId: Number(baseId), equipmentTypeId: Number(equipmentTypeId), quantity: Number(quantity), recordedBy: req.user.id }
  });
  await audit(req.user.id, "EXPENDITURE_RECORDED", "Expenditure", item.id, item);
  res.status(201).json(item);
});

app.get("/api/expenditures", auth, async (req, res) => {
  const where = req.user.role === "BASE_COMMANDER" ? { baseId: req.user.baseId } : {};
  res.json(await prisma.expenditure.findMany({
    where,
    include: { base: true, equipmentType: true },
    orderBy: { expenditureDate: "desc" }
  }));
});

app.get("/api/audit-logs", auth, roles("ADMIN"), async (_, res) => {
  res.json(await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  }));
});

app.get("/api/dashboard", auth, async (req, res) => {
  const baseId = req.query.baseId ? Number(req.query.baseId) : undefined;
  const effectiveBaseId = req.user.role === "BASE_COMMANDER" ? req.user.baseId : baseId;
  const equipmentTypeId = req.query.equipmentTypeId ? Number(req.query.equipmentTypeId) : undefined;

  const purchaseWhere = {
    ...(effectiveBaseId ? { baseId: effectiveBaseId } : {}),
    ...(equipmentTypeId ? { equipmentTypeId } : {})
  };
  const transferWhere = equipmentTypeId ? { equipmentTypeId } : {};
  const assignmentWhere = effectiveBaseId ? { baseId: effectiveBaseId } : {};
  const expenditureWhere = {
    ...(effectiveBaseId ? { baseId: effectiveBaseId } : {}),
    ...(equipmentTypeId ? { equipmentTypeId } : {})
  };

  const [p, tin, tout, assigned, expended] = await Promise.all([
    prisma.purchase.aggregate({ _sum: { quantity: true }, where: purchaseWhere }),
    prisma.transfer.aggregate({ _sum: { quantity: true }, where: { ...transferWhere, ...(effectiveBaseId ? { toBaseId: effectiveBaseId } : {}) } }),
    prisma.transfer.aggregate({ _sum: { quantity: true }, where: { ...transferWhere, ...(effectiveBaseId ? { fromBaseId: effectiveBaseId } : {}) } }),
    prisma.assignment.aggregate({ _sum: { quantity: true }, where: { ...assignmentWhere, ...(equipmentTypeId ? { equipmentTypeId } : {}) } }),
    prisma.expenditure.aggregate({ _sum: { quantity: true }, where: expenditureWhere })
  ]);

  const purchases = p._sum.quantity || 0;
  const transferIn = tin._sum.quantity || 0;
  const transferOut = tout._sum.quantity || 0;
  const assignedQty = assigned._sum.quantity || 0;
  const expendedQty = expended._sum.quantity || 0;
  const netMovement = purchases + transferIn - transferOut;

  res.json({
    openingBalance: 0,
    purchases,
    transferIn,
    transferOut,
    netMovement,
    assigned: assignedQty,
    expended: expendedQty,
    closingBalance: netMovement - expendedQty
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
