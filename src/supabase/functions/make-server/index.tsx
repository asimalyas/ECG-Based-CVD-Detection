import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger(console.log));

// Create Supabase client for admin operations
const getAdminClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
};

// Create Supabase client for user operations
const getUserClient = (token: string) => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
};

// Verify user authentication
const verifyUser = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "No authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: "Invalid token or user not found",
    };
  }

  return { user, error: null };
};

// Get user profile with fallback creation from auth metadata
const getUserProfile = async (userId: string) => {
  let userProfile = await kv.get(`user:${userId}`);

  // If profile doesn't exist in KV, create it from Supabase auth metadata
  if (!userProfile) {
    const supabase = getAdminClient();
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !user) {
      console.error("Failed to get user from auth:", error);
      return null;
    }

    const metadata = user.user_metadata || {};
    const role = metadata.role || "patient";
    let status = metadata.status;

    if (!status) {
      status = (role === "doctor" || role === "technician") ? "pending" : "approved";
    }

    userProfile = {
      id: user.id,
      email: user.email,
      name: metadata.name || user.email?.split("@")[0] || "User",
      role: role,
      phone: metadata.phone || "",
      organization: metadata.organization || "",
      status: status,
      created_at: new Date().toISOString(),
    };

    // Store the profile in KV
    await kv.set(`user:${userId}`, userProfile);
    console.log("Created user profile in KV from auth metadata:", userProfile);

    // Add to role-specific list
    const roleUsers = (await kv.get(`users:${role}`)) || [];
    if (!roleUsers.includes(userId)) {
      roleUsers.push(userId);
      await kv.set(`users:${role}`, roleUsers);
    }

    // If pending, add to pending list
    if (status === "pending") {
      const pendingUsers = (await kv.get("users:pending")) || [];
      if (!pendingUsers.includes(userId)) {
        pendingUsers.push(userId);
        await kv.set("users:pending", pendingUsers);
      }
    }
  }

  return userProfile;
};

// Initialize storage bucket
const initStorage = async () => {
  const supabase = getAdminClient();
  const bucketName = "make-39210185-ecg-files";

  const { data: buckets } =
    await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(
    (bucket) => bucket.name === bucketName,
  );

  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    });
    console.log(`Created storage bucket: ${bucketName}`);
  }
};

// Initialize on startup
initStorage();

// ============================================
// AUTH ENDPOINTS
// ============================================

// Check if admin exists (for signup flow)
app.get(
  "/auth/admin-exists",
  async (c) => {
    try {
      const supabase = getAdminClient();

      // Query Supabase Auth to find users with admin role in metadata
      const { data: users, error } =
        await supabase.auth.admin.listUsers();

      if (error) {
        console.error("Error listing users:", error);
        return c.json(
          { error: "Failed to check admin existence" },
          500,
        );
      }

      // Check if any user has role 'admin' in their metadata
      const adminUsers = users.users.filter(
        (user) => user.user_metadata?.role === "admin",
      );

      console.log(`Admin check: Found ${adminUsers.length} admin(s) out of ${users.users.length} total users`);

      return c.json({
        exists: adminUsers.length > 0,
        count: adminUsers.length,
      });
    } catch (error) {
      console.error("Error checking admin existence:", error);
      return c.json(
        { error: "Failed to check admin existence" },
        500,
      );
    }
  },
);

// Signup endpoint
app.post("/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, phone, organization } =
      body;

    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = getAdminClient();

    // Determine approval status based on role
    const status =
      role === "doctor" || role === "technician"
        ? "pending"
        : "approved";

    // Create user with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since we don't have email server configured
        user_metadata: {
          name,
          role,
          phone: phone || "",
          organization: organization || "",
          status,
        },
      });

    if (authError) {
      console.error("Auth error during signup:", authError);
      console.error("Failed signup attempt - Email:", email, "Role:", role);
      
      // Provide helpful error messages
      if (authError.message?.includes("already registered")) {
        return c.json({ 
          error: "An account with this email already exists. Please login instead.",
        }, 400);
      }
      
      return c.json({ error: authError.message || "Failed to create account" }, 400);
    }

    console.log("User created successfully:", authData.user.id, email, "Role:", role, "Status:", status);

    // Store user profile in KV store
    const userProfile = {
      id: authData.user.id,
      email,
      name,
      role,
      phone: phone || "",
      organization: organization || "",
      status,
      created_at: new Date().toISOString(),
    };
    await kv.set(`user:${authData.user.id}`, userProfile);
    console.log("[Signup] Stored user profile in KV:", userProfile);

    // Store in role-specific list
    const roleUsers = (await kv.get(`users:${role}`)) || [];
    roleUsers.push(authData.user.id);
    await kv.set(`users:${role}`, roleUsers);
    console.log(`[Signup] Added user to users:${role} list. Total ${role}s: ${roleUsers.length}`);

    // If pending, add to pending list
    if (status === "pending") {
      const pendingUsers =
        (await kv.get("users:pending")) || [];
      pendingUsers.push(authData.user.id);
      await kv.set("users:pending", pendingUsers);
      console.log(`[Signup] Added user to pending list. Total pending users: ${pendingUsers.length}`);
    }

    return c.json({
      message:
        status === "pending"
          ? "Account created. Awaiting admin approval."
          : "Account created successfully.",
      status,
      userId: authData.user.id,
    });
  } catch (error) {
    console.error("Critical error during signup:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ 
      error: "Signup failed due to server error. Please try again.",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Login endpoint
app.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json(
        { error: "Email and password are required" },
        400,
      );
    }

    const supabase = getAdminClient();

    // Sign in user
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      console.error("Sign in error:", signInError);
      console.error("Failed login attempt for email:", email);
      
      // Check if this is because the user doesn't exist
      if (signInError.message?.includes("Invalid login credentials")) {
        return c.json({ 
          error: "No account found with these credentials. Please sign up first.",
          hint: "If you're a Doctor or Technician, you need to sign up and wait for admin approval."
        }, 401);
      }
      
      return c.json({ error: signInError.message || "Invalid credentials" }, 401);
    }

    console.log("User authenticated successfully:", signInData.user.id, signInData.user.email);

    // Get user profile from KV store
    let userProfile = await kv.get(
      `user:${signInData.user.id}`,
    );

    // If profile doesn't exist in KV, create it from user metadata
    if (!userProfile) {
      console.log("User profile not in KV, creating from auth metadata for user:", signInData.user.id);
      const metadata = signInData.user.user_metadata || {};
      
      // Determine status - if metadata has status use it, otherwise default based on role
      const role = metadata.role || "patient";
      let status = metadata.status;
      
      if (!status) {
        // If no status in metadata, apply default logic
        status = (role === "doctor" || role === "technician") ? "pending" : "approved";
      }

      userProfile = {
        id: signInData.user.id,
        email: signInData.user.email,
        name: metadata.name || signInData.user.email?.split("@")[0] || "User",
        role: role,
        phone: metadata.phone || "",
        organization: metadata.organization || "",
        status: status,
        created_at: new Date().toISOString(),
      };

      // Store the profile in KV
      await kv.set(`user:${signInData.user.id}`, userProfile);
      console.log("Created user profile in KV:", userProfile);

      // Add to role-specific list
      const roleUsers = (await kv.get(`users:${role}`)) || [];
      if (!roleUsers.includes(signInData.user.id)) {
        roleUsers.push(signInData.user.id);
        await kv.set(`users:${role}`, roleUsers);
      }

      // If pending, add to pending list
      if (status === "pending") {
        const pendingUsers = (await kv.get("users:pending")) || [];
        if (!pendingUsers.includes(signInData.user.id)) {
          pendingUsers.push(signInData.user.id);
          await kv.set("users:pending", pendingUsers);
        }
      }
    }

    // Check approval status
    if (userProfile.status === "pending") {
      return c.json(
        {
          error:
            "Your account is awaiting admin approval. Please contact an administrator.",
          status: "pending",
        },
        403,
      );
    }

    if (userProfile.status === "rejected") {
      return c.json(
        {
          error:
            "Your account has been rejected. Please contact an administrator.",
          status: "rejected",
        },
        403,
      );
    }

    return c.json({
      access_token: signInData.session.access_token,
      user: {
        id: signInData.user.id,
        email: signInData.user.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone,
        organization: userProfile.organization,
        status: userProfile.status,
      },
    });
  } catch (error) {
    console.error("Critical error during login:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return c.json({ 
      error: "Login failed due to server error. Please try again.",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get current user session
app.get("/auth/me", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await getUserProfile(user.id);

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: userProfile.name,
        role: userProfile.role,
        phone: userProfile.phone,
        organization: userProfile.organization,
        status: userProfile.status,
      },
    });
  } catch (error) {
    console.error("Error getting user session:", error);
    return c.json({ error: "Failed to get user session" }, 500);
  }
});

// ============================================
// USER MANAGEMENT ENDPOINTS
// ============================================

// Get pending users (Admin only)
app.get("/users/pending", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      console.log("[Pending Users] Unauthorized access attempt");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const adminProfile = await getUserProfile(user.id);
    if (!adminProfile || adminProfile.role !== "admin") {
      console.log(`[Pending Users] Non-admin access attempt by ${user.id}`);
      return c.json(
        { error: "Forbidden: Admin access required" },
        403,
      );
    }

    const pendingUserIds =
      (await kv.get("users:pending")) || [];
    console.log(`[Pending Users] Found ${pendingUserIds.length} pending user IDs:`, pendingUserIds);
    
    const pendingUsers = [];

    for (const userId of pendingUserIds) {
      const userProfile = await kv.get(`user:${userId}`);
      if (userProfile) {
        console.log(`[Pending Users] User ${userId}: ${userProfile.name} (${userProfile.role}) - Status: ${userProfile.status}`);
        if (userProfile.status === "pending") {
          pendingUsers.push(userProfile);
        }
      } else {
        console.log(`[Pending Users] WARNING: User profile not found for ID ${userId}`);
      }
    }

    console.log(`[Pending Users] Returning ${pendingUsers.length} pending users`);
    return c.json({ users: pendingUsers });
  } catch (error) {
    console.error("[Pending Users] Error fetching pending users:", error);
    return c.json(
      { error: "Failed to fetch pending users" },
      500,
    );
  }
});

// Approve user (Admin only)
app.post(
  "/users/:userId/approve",
  async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);

      if (error || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const adminProfile = await getUserProfile(user.id);
      if (!adminProfile || adminProfile.role !== "admin") {
        return c.json(
          { error: "Forbidden: Admin access required" },
          403,
        );
      }

      const userId = c.req.param("userId");
      const userProfile = await kv.get(`user:${userId}`);

      if (!userProfile) {
        return c.json({ error: "User not found" }, 404);
      }

      // Update user status in KV
      userProfile.status = "approved";
      await kv.set(`user:${userId}`, userProfile);

      // ✅ Update user status in Supabase Auth
      const supabase = getAdminClient();
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          name: userProfile.name,
          role: userProfile.role,
          phone: userProfile.phone,
          organization: userProfile.organization,
          status: "approved",
        },
      });

      // Remove from pending list
      const pendingUsers =
        (await kv.get("users:pending")) || [];
      const updatedPending = pendingUsers.filter(
        (id: string) => id !== userId,
      );
      await kv.set("users:pending", updatedPending);
      console.log(`[Approve User] Removed ${userId} from pending list. Pending before: ${pendingUsers.length}, after: ${updatedPending.length}`);

      // Log audit event
      const auditLog = {
        id: `audit:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        admin_id: user.id,
        admin_name: adminProfile.name,
        action: "approve_user",
        target_user_id: userId,
        target_user_email: userProfile.email,
        details: `Approved ${userProfile.role} account for ${userProfile.name}`,
      };
      await kv.set(auditLog.id, auditLog);

      console.log(`[Approve User] Successfully approved ${userProfile.name} (${userProfile.role})`);
      return c.json({
        message: "User approved successfully",
        user: userProfile,
      });
    } catch (error) {
      console.error("Error approving user:", error);
      return c.json({ error: "Failed to approve user" }, 500);
    }
  },
);

// Reject user (Admin only)
app.post(
  "/users/:userId/reject",
  async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);

      if (error || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const adminProfile = await getUserProfile(user.id);
      if (!adminProfile || adminProfile.role !== "admin") {
        return c.json(
          { error: "Forbidden: Admin access required" },
          403,
        );
      }

      const userId = c.req.param("userId");
      const userProfile = await kv.get(`user:${userId}`);

      if (!userProfile) {
        return c.json({ error: "User not found" }, 404);
      }

      // Update user status
      userProfile.status = "rejected";
      await kv.set(`user:${userId}`, userProfile);

      // Remove from pending list
      const pendingUsers =
        (await kv.get("users:pending")) || [];
      const updatedPending = pendingUsers.filter(
        (id: string) => id !== userId,
      );
      await kv.set("users:pending", updatedPending);

      // Log audit event
      const auditLog = {
        id: `audit:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        admin_id: user.id,
        admin_name: adminProfile.name,
        action: "reject_user",
        target_user_id: userId,
        target_user_email: userProfile.email,
        details: `Rejected ${userProfile.role} account for ${userProfile.name}`,
      };
      await kv.set(auditLog.id, auditLog);

      return c.json({
        message: "User rejected successfully",
        user: userProfile,
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      return c.json({ error: "Failed to reject user" }, 500);
    }
  },
);

// Get all users (Admin only)
app.get("/users", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const adminProfile = await getUserProfile(user.id);
    if (!adminProfile || adminProfile.role !== "admin") {
      return c.json(
        { error: "Forbidden: Admin access required" },
        403,
      );
    }

    const allUsers = await kv.getByPrefix("user:");

    return c.json({ users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Update user profile
app.put("/users/profile", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { name, phone, organization } = body;

    const userProfile = await getUserProfile(user.id);

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Update profile fields
    if (name) userProfile.name = name;
    if (phone !== undefined) userProfile.phone = phone;
    if (organization !== undefined)
      userProfile.organization = organization;
    userProfile.updated_at = new Date().toISOString();

    await kv.set(`user:${user.id}`, userProfile);

    return c.json({
      message: "Profile updated successfully",
      user: userProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Get patients list (for Doctors and Technicians)
app.get("/patients", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const patientIds = (await kv.get("users:patient")) || [];
    const patients = [];

    for (const patientId of patientIds) {
      const patient = await kv.get(`user:${patientId}`);
      if (patient && patient.status === "approved") {
        // Get patient's ECG records to calculate stats
        const patientEcgIds =
          (await kv.get(`patient:${patientId}:ecgs`)) || [];
        let lastVisit = null;
        let assignedDoctor = null;

        // Get the most recent ECG and assigned doctor
        if (patientEcgIds.length > 0) {
          const latestEcgId =
            patientEcgIds[patientEcgIds.length - 1];
          const latestEcg = await kv.get(latestEcgId);
          if (latestEcg) {
            lastVisit = latestEcg.upload_date;
            if (latestEcg.assigned_doctor_id) {
              const doctor = await kv.get(
                `user:${latestEcg.assigned_doctor_id}`,
              );
              if (doctor) {
                assignedDoctor = doctor.name;
              }
            }
          }
        }

        // Calculate age from dateOfBirth if available
        let age = null;
        if (patient.dateOfBirth) {
          const birthDate = new Date(patient.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff =
            today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 &&
              today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
        }

        patients.push({
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone || "N/A",
          gender: patient.gender || "N/A",
          age: age,
          dateOfBirth: patient.dateOfBirth || null,
          assignedDoctor: assignedDoctor || "Not Assigned",
          lastVisit: lastVisit,
          status: patient.status,
          reportCount: patientEcgIds.length,
        });
      }
    }

    return c.json({ patients });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return c.json({ error: "Failed to fetch patients" }, 500);
  }
});

// Get doctors list (for Technicians)
app.get("/doctors", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      console.error(
        "Unauthorized access to /doctors endpoint:",
        error,
      );
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log(`Fetching doctors list for user: ${user.id}`);

    const doctorIds = (await kv.get("users:doctor")) || [];
    console.log(
      `Found ${doctorIds.length} doctor IDs in KV store:`,
      doctorIds,
    );

    const doctors = [];

    for (const doctorId of doctorIds) {
      try {
        const doctor = await kv.get(`user:${doctorId}`);
        console.log(
          `Doctor ${doctorId}:`,
          doctor
            ? `${doctor.name} (${doctor.status})`
            : "not found",
        );

        if (doctor && doctor.status === "approved") {
          // Ensure all fields are properly formatted
          doctors.push({
            id: String(doctor.id || doctorId),
            name: String(doctor.name || "Unknown"),
            email: String(doctor.email || ""),
            organization: String(doctor.organization || ""),
          });
        }
      } catch (err) {
        console.error(
          `Error processing doctor ${doctorId}:`,
          err,
        );
        // Continue with next doctor instead of failing completely
        continue;
      }
    }

    console.log(`Returning ${doctors.length} approved doctors`);

    // Ensure we return valid JSON with proper structure
    return c.json({
      doctors: doctors,
      count: doctors.length,
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    // Return valid JSON even on error
    return c.json(
      {
        error: "Failed to fetch doctors",
        doctors: [],
        count: 0,
      },
      500,
    );
  }
});

// ============================================
// ECG RECORD ENDPOINTS
// ============================================

// Upload ECG file
app.post("/ecg/upload", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await getUserProfile(user.id);

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Only patients and technicians can upload ECGs
    if (
      !["patient", "technician"].includes(userProfile.role)
    ) {
      return c.json(
        {
          error:
            "Forbidden: Only patients and technicians can upload ECGs",
        },
        403,
      );
    }

    const body = await c.req.json();
    const {
      fileName,
      fileData,
      patientId,
      doctorId,
      fileType,
    } = body;

    if (!fileName || !fileData) {
      return c.json(
        { error: "Missing file name or data" },
        400,
      );
    }

    // For technicians, patientId and doctorId are required
    const targetPatientId =
      userProfile.role === "technician"
        ? patientId || null
        : user.id;

    if (!targetPatientId) {
      return c.json(
        {
          error:
            "Patient ID is required for technician uploads",
        },
        400,
      );
    }

    // For technicians and patients, doctor assignment is required
    if (
      (userProfile.role === "technician" ||
        userProfile.role === "patient") &&
      !doctorId
    ) {
      return c.json(
        {
          error: "Doctor assignment is required",
        },
        400,
      );
    }

    const supabase = getAdminClient();
    const bucketName = "make-39210185-ecg-files";

    // Convert base64 to buffer
    const fileBuffer = Uint8Array.from(atob(fileData), (c) =>
      c.charCodeAt(0),
    );

    // Generate unique file name
    const timestamp = Date.now();
    const uniqueFileName = `${targetPatientId}/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } =
      await supabase.storage
        .from(bucketName)
        .upload(uniqueFileName, fileBuffer, {
          contentType: fileType || "text/csv",
          upsert: false,
        });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return c.json(
        { error: "Failed to upload file to storage" },
        500,
      );
    }

    // Get doctor info if assigned
    let doctorName = null;
    if (doctorId) {
      const doctor = await kv.get(`user:${doctorId}`);
      doctorName = doctor?.name || "Unknown";
    }

    // Create ECG record
    const ecgRecord = {
      id: `ecg:${timestamp}:${Math.random().toString(36).substr(2, 9)}`,
      patient_id: targetPatientId,
      uploaded_by: user.id,
      uploaded_by_name: userProfile.name,
      uploaded_by_role: userProfile.role,
      assigned_doctor_id: doctorId || null,
      assigned_doctor_name: doctorName,
      file_name: fileName,
      file_path: uniqueFileName,
      file_type: fileType || "text/csv",
      status: "pending",
      prediction: null,
      confidence: null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      comments: null,
    };

    await kv.set(ecgRecord.id, ecgRecord);

    // Add to patient's ECG list
    const patientEcgs =
      (await kv.get(`patient:${targetPatientId}:ecgs`)) || [];
    patientEcgs.push(ecgRecord.id);
    await kv.set(
      `patient:${targetPatientId}:ecgs`,
      patientEcgs,
    );

    // Add to all ECGs list
    const allEcgs = (await kv.get("ecgs:all")) || [];
    allEcgs.push(ecgRecord.id);
    await kv.set("ecgs:all", allEcgs);

    return c.json({
      message: "ECG uploaded successfully",
      record: ecgRecord,
    });
  } catch (error) {
    console.error("Error uploading ECG:", error);
    return c.json({ error: "Failed to upload ECG" }, 500);
  }
});

// Get ECG records
app.get("/ecg/records", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await getUserProfile(user.id);
    
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }
    
    let ecgRecords = [];

    if (userProfile.role === "patient") {
      // Patients see only their own ECGs
      const patientEcgIds =
        (await kv.get(`patient:${user.id}:ecgs`)) || [];
      for (const ecgId of patientEcgIds) {
        const record = await kv.get(ecgId);
        if (record) {
          // Get patient name
          const patient = await kv.get(
            `user:${record.patient_id}`,
          );
          record.patient_name = patient?.name || "Unknown";
          ecgRecords.push(record);
        }
      }
    } else if (userProfile.role === "doctor") {
      // Doctors see ONLY ECGs assigned to them
      const allEcgIds = (await kv.get("ecgs:all")) || [];
      for (const ecgId of allEcgIds) {
        const record = await kv.get(ecgId);
        if (record) {
          // Filter: only show ECGs assigned to this doctor
          if (record.assigned_doctor_id === user.id) {
            // Get patient name
            const patient = await kv.get(
              `user:${record.patient_id}`,
            );
            record.patient_name = patient?.name || "Unknown";
            ecgRecords.push(record);
          }
        }
      }
    } else if (userProfile.role === "technician") {
      // Technicians see ECGs they uploaded
      const allEcgIds = (await kv.get("ecgs:all")) || [];
      for (const ecgId of allEcgIds) {
        const record = await kv.get(ecgId);
        if (record && record.uploaded_by === user.id) {
          // Get patient name
          const patient = await kv.get(
            `user:${record.patient_id}`,
          );
          record.patient_name = patient?.name || "Unknown";

          // Get assigned doctor name if exists
          if (record.assigned_doctor_id) {
            const doctor = await kv.get(
              `user:${record.assigned_doctor_id}`,
            );
            record.assigned_doctor_name =
              doctor?.name || "Not Assigned";
          }

          // Remove sensitive medical data - technicians should only see status
          const technicianRecord = {
            id: record.id,
            patient_id: record.patient_id,
            patient_name: record.patient_name,
            uploaded_by: record.uploaded_by,
            uploaded_by_name: record.uploaded_by_name,
            uploaded_by_role: record.uploaded_by_role,
            assigned_doctor_id: record.assigned_doctor_id,
            assigned_doctor_name: record.assigned_doctor_name,
            file_name: record.file_name,
            file_path: record.file_path,
            file_type: record.file_type,
            status: record.status,
            created_at: record.created_at,
            reviewed_at: record.reviewed_at,
            // Explicitly exclude: prediction, confidence, comments
          };

          ecgRecords.push(technicianRecord);
        }
      }
    } else if (userProfile.role === "admin") {
      // Admins see all ECGs
      const allEcgIds = (await kv.get("ecgs:all")) || [];
      for (const ecgId of allEcgIds) {
        const record = await kv.get(ecgId);
        if (record) {
          // Get patient name
          const patient = await kv.get(
            `user:${record.patient_id}`,
          );
          record.patient_name = patient?.name || "Unknown";
          ecgRecords.push(record);
        }
      }
    }

    // Sort by created_at descending
    ecgRecords.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    return c.json({ records: ecgRecords });
  } catch (error) {
    console.error("Error fetching ECG records:", error);
    return c.json(
      { error: "Failed to fetch ECG records" },
      500,
    );
  }
});

// Get single ECG record
app.get("/ecg/:recordId", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const recordId = c.req.param("recordId");
    const record = await kv.get(recordId);

    if (!record) {
      return c.json({ error: "ECG record not found" }, 404);
    }

    // Get patient name
    const patient = await kv.get(`user:${record.patient_id}`);
    record.patient_name = patient?.name || "Unknown";

    // Get file signed URL
    const supabase = getAdminClient();
    const { data: signedUrlData, error: urlError } =
      await supabase.storage
        .from("make-39210185-ecg-files")
        .createSignedUrl(record.file_path, 3600); // 1 hour expiry

    if (signedUrlData) {
      record.file_url = signedUrlData.signedUrl;
    }

    return c.json({ record });
  } catch (error) {
    console.error("Error fetching ECG record:", error);
    return c.json({ error: "Failed to fetch ECG record" }, 500);
  }
});

// Review ECG (Doctor only)
app.post(
  "/ecg/:recordId/review",
  async (c) => {
    try {
      const { user, error } = await verifyUser(c.req.raw);

      if (error || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const userProfile = await getUserProfile(user.id);
      if (!userProfile || userProfile.role !== "doctor") {
        return c.json(
          { error: "Forbidden: Only doctors can review ECGs" },
          403,
        );
      }

      const recordId = c.req.param("recordId");
      const body = await c.req.json();
      const { status, comments, prediction, confidence } = body;

      const record = await kv.get(recordId);

      if (!record) {
        return c.json({ error: "ECG record not found" }, 404);
      }

      // Update record
      record.status = status || "reviewed";
      record.reviewed_at = new Date().toISOString();
      record.reviewed_by = user.id;
      record.reviewer_name = userProfile.name;
      if (comments) record.comments = comments;
      if (prediction) record.prediction = prediction;
      if (confidence !== undefined)
        record.confidence = confidence;

      await kv.set(recordId, record);

      // Log audit event
      const auditLog = {
        id: `audit:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        doctor_id: user.id,
        doctor_name: userProfile.name,
        action: "review_ecg",
        ecg_id: recordId,
        patient_id: record.patient_id,
        details: `Reviewed ECG with status: ${status}, prediction: ${prediction}`,
      };
      await kv.set(auditLog.id, auditLog);

      return c.json({
        message: "ECG reviewed successfully",
        record,
      });
    } catch (error) {
      console.error("Error reviewing ECG:", error);
      return c.json({ error: "Failed to review ECG" }, 500);
    }
  },
);

// ============================================
// AUDIT LOG ENDPOINTS
// ============================================

// Get audit logs (Admin only)
app.get("/audit-logs", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const adminProfile = await getUserProfile(user.id);
    if (!adminProfile || adminProfile.role !== "admin") {
      return c.json(
        { error: "Forbidden: Admin access required" },
        403,
      );
    }

    const logs = await kv.getByPrefix("audit:");

    // Sort by timestamp descending
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime(),
    );

    return c.json({ logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return c.json({ error: "Failed to fetch audit logs" }, 500);
  }
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================

// Get dashboard statistics
app.get("/stats", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.raw);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await getUserProfile(user.id);
    
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }
    
    const stats: any = {};

    if (userProfile.role === "admin") {
      // Admin stats
      const allUsers = await kv.getByPrefix("user:");
      const pendingUsers =
        (await kv.get("users:pending")) || [];
      const allEcgs = (await kv.get("ecgs:all")) || [];

      stats.totalUsers = allUsers.length;
      stats.pendingUsers = pendingUsers.length;
      stats.totalEcgs = allEcgs.length;
      stats.usersByRole = {
        patient: ((await kv.get("users:patient")) || []).length,
        doctor: ((await kv.get("users:doctor")) || []).length,
        technician: ((await kv.get("users:technician")) || [])
          .length,
        admin: ((await kv.get("users:admin")) || []).length,
      };
      
      console.log("[Stats] Admin stats:", {
        totalUsers: stats.totalUsers,
        pendingUsers: stats.pendingUsers,
        totalEcgs: stats.totalEcgs,
        usersByRole: stats.usersByRole
      });
    } else if (userProfile.role === "doctor") {
      // Doctor stats - only count ECGs assigned to this doctor
      const allEcgIds = (await kv.get("ecgs:all")) || [];
      let total = 0,
        pending = 0,
        reviewed = 0,
        abnormal = 0;

      for (const ecgId of allEcgIds) {
        const record = await kv.get(ecgId);
        if (record && record.assigned_doctor_id === user.id) {
          total++;
          if (record.status === "pending") pending++;
          if (record.status === "reviewed") reviewed++;
          if (record.prediction === "abnormal") abnormal++;
        }
      }

      stats.totalEcgs = total;
      stats.pendingReviews = pending;
      stats.reviewedEcgs = reviewed;
      stats.abnormalCases = abnormal;
    } else if (userProfile.role === "patient") {
      // Patient stats
      const patientEcgIds =
        (await kv.get(`patient:${user.id}:ecgs`)) || [];
      let pending = 0,
        reviewed = 0,
        abnormal = 0;

      for (const ecgId of patientEcgIds) {
        const record = await kv.get(ecgId);
        if (record) {
          if (record.status === "pending") pending++;
          if (record.status === "reviewed") reviewed++;
          if (record.prediction === "abnormal") abnormal++;
        }
      }

      stats.totalEcgs = patientEcgIds.length;
      stats.pendingReviews = pending;
      stats.reviewedEcgs = reviewed;
      stats.abnormalResults = abnormal;
    } else if (userProfile.role === "technician") {
      // Technician stats
      const allEcgIds = (await kv.get("ecgs:all")) || [];
      let uploadedCount = 0;

      for (const ecgId of allEcgIds) {
        const record = await kv.get(ecgId);
        if (record && record.uploaded_by === user.id) {
          uploadedCount++;
        }
      }

      stats.totalUploads = uploadedCount;
    }

    return c.json({ stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "Cardiovascular Disease Detection API",
  });
});

Deno.serve(app.fetch);
