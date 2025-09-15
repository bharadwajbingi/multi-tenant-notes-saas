// server.js
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(
  cors({
    origin: "https://multi-tenant-notes-saas-frontend-five.vercel.app", // your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true, // if using cookies
  })
);
app.use(express.json());

// Database Connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Database Schema and Models
const tenantSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  plan: { type: String, enum: ["Free", "Pro"], default: "Free" },
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Member"], default: "Member" },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
});

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  { timestamps: true }
);

const Tenant = mongoose.model("Tenant", tenantSchema);
const User = mongoose.model("User", userSchema);
const Note = mongoose.model("Note", noteSchema);

// Helper function to seed initial data
const seedData = async () => {
  try {
    const acmeTenant = await Tenant.findOneAndUpdate(
      { slug: "acme" },
      { name: "Acme" },
      { upsert: true, new: true }
    );
    const globexTenant = await Tenant.findOneAndUpdate(
      { slug: "globex" },
      { name: "Globex" },
      { upsert: true, new: true }
    );

    const passwordHash = await bcrypt.hash("password", 10);

    await User.findOneAndUpdate(
      { email: "admin@acme.test" },
      { password: passwordHash, role: "Admin", tenant: acmeTenant._id },
      { upsert: true }
    );
    await User.findOneAndUpdate(
      { email: "user@acme.test" },
      { password: passwordHash, role: "Member", tenant: acmeTenant._id },
      { upsert: true }
    );
    await User.findOneAndUpdate(
      { email: "admin@globex.test" },
      { password: passwordHash, role: "Admin", tenant: globexTenant._id },
      { upsert: true }
    );
    await User.findOneAndUpdate(
      { email: "user@globex.test" },
      { password: passwordHash, role: "Member", tenant: globexTenant._id },
      { upsert: true }
    );

    console.log("Initial data seeded successfully.");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};

// Start server and seed data
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await seedData();
});

// Middlewares
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication failed: No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed: Invalid token." });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied: Admin role required." });
  }
  next();
};

const enforceTenantIsolation = async (req, res, next) => {
  if (req.params.id) {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }
    if (note.tenant.toString() !== req.user.tenantId) {
      return res.status(403).json({
        message: "Access denied: Note does not belong to your tenant.",
      });
    }
  }
  next();
};

// =============================================================================
// Routes
// =============================================================================

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Login Endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).populate("tenant");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      tenantId: user.tenant._id,
      tenantSlug: user.tenant.slug,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    user: {
      email: user.email,
      role: user.role,
      tenant: {
        slug: user.tenant.slug,
        plan: user.tenant.plan,
      },
    },
  });
});

// Invite User Endpoint
app.post(
  "/api/users/invite",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const { username, role } = req.body;
    const { tenantId, tenantSlug } = req.user;

    // Construct the email from the username and tenant slug
    const email = `${username.toLowerCase()}@${tenantSlug}.test`;
    const password = "password";

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "User with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = new User({
        email,
        password: passwordHash,
        role: role || "Member",
        tenant: tenantId,
      });

      await newUser.save();

      res.status(201).json({
        message: "User invited successfully.",
        user: { email: newUser.email, role: newUser.role },
      });
    } catch (error) {
      console.error("Error inviting user:", error);
      res.status(500).json({ message: "Failed to invite user." });
    }
  }
);

// Notes API (CRUD)
app.post("/api/notes", authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  const { tenantId, userId } = req.user;

  const tenant = await Tenant.findById(tenantId);
  const noteCount = await Note.countDocuments({ tenant: tenantId });

  if (tenant.plan === "Free" && noteCount >= 3) {
    return res
      .status(403)
      .json({ message: "Note limit reached for Free plan. Please upgrade." });
  }

  const newNote = new Note({
    title,
    content,
    owner: userId,
    tenant: tenantId,
  });

  await newNote.save();
  res.status(201).json(newNote);
});

app.get("/api/notes", authMiddleware, async (req, res) => {
  const notes = await Note.find({ tenant: req.user.tenantId }).sort({
    createdAt: -1,
  });
  res.json(notes);
});

app.get(
  "/api/notes/:id",
  authMiddleware,
  enforceTenantIsolation,
  async (req, res) => {
    const note = await Note.findById(req.params.id);
    res.json(note);
  }
);

app.put(
  "/api/notes/:id",
  authMiddleware,
  enforceTenantIsolation,
  async (req, res) => {
    const updatedNote = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedNote);
  }
);

app.delete(
  "/api/notes/:id",
  authMiddleware,
  enforceTenantIsolation,
  async (req, res) => {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted successfully." });
  }
);

// Subscription Upgrade Endpoint
app.post(
  "/api/tenants/:slug/upgrade",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const { slug } = req.params;

    if (req.user.tenantSlug !== slug) {
      return res.status(403).json({
        message: "Access denied: You can only upgrade your own tenant.",
      });
    }

    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { plan: "Pro" },
      { new: true }
    );
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    res.json({
      message: `Tenant ${tenant.name} upgraded to Pro plan.`,
      tenant,
    });
  }
);
