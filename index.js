import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

// Validate environment variables
const validateEnv = () => {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing);
    process.exit(1);
  }
};

validateEnv();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase configuration. Please check your environment variables."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("in_stock", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Normalize image_urls to always be an array
    const normalizedData = data.map((product) => ({
      ...product,
      image_urls: Array.isArray(product.image_urls) 
        ? product.image_urls 
        : product.image_url 
          ? [product.image_url]
          : [],
    }));
    
    res.json(normalizedData);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    
    // Normalize image_urls to always be an array
    const normalizedData = {
      ...data,
      image_urls: Array.isArray(data.image_urls) 
        ? data.image_urls 
        : data.image_url 
          ? [data.image_url]
          : [],
    };
    
    res.json(normalizedData);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Categories endpoints
app.get("/api/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Auth routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, fullName, phone, role = "customer" } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Email, password, and full name are required",
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: role,
        },
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth/customer/login`,
      },
    });

    if (authError) {
      console.error("Auth signup error:", authError);
      return res.status(400).json({
        error: "Auth signup failed",
        details: authError.message,
      });
    }

    if (!authData?.user) {
      console.error("No user data returned from auth signup");
      return res.status(500).json({
        error: "User creation failed",
        details: "No user data returned. This may happen if email confirmation is required.",
      });
    }

    // Wait for database trigger to create user profile
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Verify profile was created by trigger, create manually if needed
    let userProfile;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();
      
      if (result.data) {
        userProfile = result.data;
        break;
      }
      
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Fallback: create profile manually if trigger didn't create it
    if (!userProfile) {
      const { data: createdProfile, error: createError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          phone: phone || null,
          role: role,
        })
        .select()
        .single();

      if (createError) {
        // Ignore duplicate key errors (trigger created it)
        if (createError.code !== '23505' && !createError.message?.includes('duplicate')) {
          console.error("Profile creation error:", createError);
        }
        // Try to fetch profile one more time
        const retryResult = await supabase
          .from("users")
          .select("*")
          .eq("id", authData.user.id)
          .single();
        userProfile = retryResult.data;
      } else {
        userProfile = createdProfile;
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: authData.user.id,
        email: authData.user.email,
        role: role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.status(201).json({
      message: "Signup successful. Please check your email for verification.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: role,
      },
      token,
    });
  } catch (error) {
    console.error("Unexpected error during signup:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get user profile from public.users table
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return res.status(404).json({ error: "User profile not found" });
    }

    // Check if rider and not approved
    if (userProfile.role === 'rider' && !userProfile.approved) {
      return res.status(403).json({ 
        error: "Account pending approval", 
        details: `Your rider account is ${userProfile.approval_status}. Please wait for admin approval.`
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: data.user.id,
        email: data.user.email,
        role: userProfile.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userProfile.role,
        approved: userProfile.approved,
        approval_status: userProfile.approval_status,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/signout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Signout successful" });
  } catch (error) {
    console.error("Signout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Protected routes
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.userId)
      .single();

    if (error) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, avatarUrl } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin routes - Rider Management
app.get("/api/admin/riders", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from("users")
      .select("*")
      .eq("role", "rider")
      .order("created_at", { ascending: false });

    // Filter by approval status if provided
    if (status) {
      query = query.eq("approval_status", status);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching riders:", error);
    res.status(500).json({ error: "Failed to fetch riders" });
  }
});

app.get("/api/admin/riders/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .eq("role", "rider")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching rider:", error);
    res.status(500).json({ error: "Failed to fetch rider" });
  }
});

app.put("/api/admin/riders/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("users")
      .update({
        approved: true,
        approval_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("role", "rider")
      .select()
      .single();

    if (error) throw error;
    
    res.json({
      message: "Rider approved successfully",
      rider: data,
    });
  } catch (error) {
    console.error("Error approving rider:", error);
    res.status(500).json({ error: "Failed to approve rider" });
  }
});

app.put("/api/admin/riders/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const { data, error } = await supabase
      .from("users")
      .update({
        approved: false,
        approval_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("role", "rider")
      .select()
      .single();

    if (error) throw error;
    
    res.json({
      message: "Rider rejected",
      rider: data,
    });
  } catch (error) {
    console.error("Error rejecting rider:", error);
    res.status(500).json({ error: "Failed to reject rider" });
  }
});

// Get all users (admin only)
app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
