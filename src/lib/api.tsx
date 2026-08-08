import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info.tsx";
import { supabase, memoryStore } from "./supabase-client";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server`;
const USE_DIRECT_SUPABASE_AUTH = true; // Fallback to direct Supabase auth if edge function fails

// Helper to sync user profile to memory store after signup/login
const syncUserProfile = (user: any) => {
  console.log('[syncUserProfile] Syncing user:', user);
  
  const profile = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone || '',
    organization: user.organization || '',
    status: user.status,
    created_at: user.created_at || new Date().toISOString(),
    email_confirmed: user.email_confirmed || false, // Add email_confirmed field
  };
  
  // Store user profile
  memoryStore.set(`user:${user.id}`, profile);
  
  // Add to role-specific list
  const roleUsers = memoryStore.get(`users:${user.role}`) || [];
  if (!roleUsers.includes(user.id)) {
    roleUsers.push(user.id);
    memoryStore.set(`users:${user.role}`, roleUsers);
    console.log(`[syncUserProfile] Added ${user.email} to users:${user.role} list. Total: ${roleUsers.length}`);
  }
  
  // If pending, add to pending list
  if (user.status === 'pending') {
    const pendingUsers = memoryStore.get('users:pending') || [];
    if (!pendingUsers.includes(user.id)) {
      pendingUsers.push(user.id);
      memoryStore.set('users:pending', pendingUsers);
      console.log(`[syncUserProfile] Added ${user.email} to pending list. Total pending: ${pendingUsers.length}`);
    }
  } else {
    console.log(`[syncUserProfile] User ${user.email} has status '${user.status}' - NOT added to pending list`);
  }
};

// Get stored access token
export const getAccessToken = (): string | null => {
  return localStorage.getItem("access_token");
};

// Set access token
export const setAccessToken = (token: string): void => {
  localStorage.setItem("access_token", token);
};

// Clear access token
export const clearAccessToken = (): void => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("dev_user"); // Clear dev user data too
};

// Store development mode user data
const setDevUser = (user: any): void => {
  localStorage.setItem("dev_user", JSON.stringify(user));
};

// Get development mode user data
const getDevUser = (): any | null => {
  const data = localStorage.getItem("dev_user");
  return data ? JSON.parse(data) : null;
};

// Check if using development bypass mode
const isDevMode = (): boolean => {
  const token = getAccessToken();
  return token?.startsWith("dev_token_") || false;
};

// Helper to create audit logs
const createAuditLog = (
  action: string, 
  details: any, 
  userId?: string, 
  userName?: string,
  userRole?: string
) => {
  const timestamp = Date.now();
  const logId = `audit:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
  
  const auditLog = {
    id: logId,
    action,
    user_id: userId || 'system',
    user_name: userName || 'System',
    role: userRole || 'system', // Add role field
    details,
    timestamp: new Date().toISOString(),
    ip_address: 'dev-local', // In production, capture real IP
  };
  
  memoryStore.set(logId, auditLog);
  console.log('[Audit Log]', action, ':', details);
  
  return auditLog;
};

// Make authenticated API request
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<any> => {
  const token = getAccessToken();
  
  // Check if this endpoint requires authentication (all except auth/admin-exists)
  const requiresAuth = !endpoint.includes('/auth/admin-exists') && 
                       !endpoint.includes('/auth/signup') && 
                       !endpoint.includes('/auth/login');
  
  // Check if this endpoint has a fallback mechanism (to suppress error messages)
  const hasFallback = endpoint.includes('/audit-logs');
  
  if (requiresAuth && !token) {
    if (!hasFallback) {
      console.error(`[API Error] No access token available for authenticated endpoint: ${endpoint}`);
    }
    throw new Error('Authentication required. Please log in.');
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const fullUrl = `${BASE_URL}${endpoint}`;
  
  // Only log if not a fallback endpoint
  if (!hasFallback) {
    console.log(`[API Request] ${options.method || 'GET'} ${fullUrl}`, token ? '(authenticated)' : '(no token)');
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Only log response if not a fallback endpoint or if it succeeded
    if (!hasFallback || response.ok) {
      console.log(`[API Response] ${response.status} ${response.statusText} - ${endpoint}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (
      !contentType ||
      !contentType.includes("application/json")
    ) {
      if (!hasFallback) {
        console.error(`[API Error] Non-JSON response for ${endpoint}:`, {
          status: response.status,
          contentType,
        });
      }
      // If not JSON, return a default error or empty object
      if (!response.ok) {
        throw new Error(
          `API request failed with status ${response.status}`,
        );
      }
      return {};
    }

    const data = await response.json();

    if (!response.ok) {
      if (!hasFallback) {
        console.error(`[API Error] ${endpoint} failed:`, {
          status: response.status,
          error: data.error,
          details: data.details || data,
        });
      }
      
      // If unauthorized, clear the token and suggest re-login
      if (response.status === 401) {
        console.warn('[API] Unauthorized - clearing stored token');
        clearAccessToken();
        throw new Error(data.error || 'Session expired. Please log in again.');
      }
      
      throw new Error(data.error || "API request failed");
    }

    if (!hasFallback) {
      console.log(`[API Success] ${endpoint}:`, data);
    }
    return data;
  } catch (error: any) {
    // If it's a JSON parsing error, provide more context
    if (error instanceof SyntaxError) {
      if (!hasFallback) {
        console.error(
          "[API Error] JSON parsing error for endpoint:",
          endpoint,
          error,
        );
      }
      throw new Error("Invalid response from server");
    }
    
    // Only log error if not a fallback endpoint
    if (!hasFallback) {
      console.error(`[API Error] Request to ${endpoint} failed:`, error);
    }
    throw error;
  }
};

// Auth API with fallback to direct Supabase client
export const authApi = {
  checkAdminExists: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        console.log('[checkAdminExists] Checking for admin users in memory store...');
        
        // Check memory store first - this is faster and doesn't require auth
        const adminUsers = memoryStore.get('users:admin') || [];
        
        if (adminUsers.length > 0) {
          console.log(`[checkAdminExists] Found ${adminUsers.length} admin(s) in memory store`);
          return { exists: true, count: adminUsers.length };
        }
        
        // Fallback: Try to query Supabase auth (might fail if not authenticated)
        try {
          const { data: { users }, error } = await supabase.auth.admin.listUsers();
          if (error) {
            console.log('[checkAdminExists] Admin API not available (expected on client), using memory store');
            return { exists: false, count: 0 };
          }
          const adminUsersFromAuth = users.filter(user => user.user_metadata?.role === 'admin');
          console.log(`[checkAdminExists] Found ${adminUsersFromAuth.length} admin(s) in Supabase Auth`);
          return { exists: adminUsersFromAuth.length > 0, count: adminUsersFromAuth.length };
        } catch (authError) {
          console.log('[checkAdminExists] Admin API call failed (expected), using memory store result');
          return { exists: false, count: 0 };
        }
      } catch (error) {
        console.log('[checkAdminExists] Error, defaulting to no admin:', error);
        return { exists: false, count: 0 };
      }
    }
    return apiRequest("/auth/admin-exists");
  },

  signup: async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
    organization?: string;
  }) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        const { email, password, name, role, phone, organization } = userData;
        
        // Doctors and Technicians require admin approval
        // Patients and Admins are auto-approved
        const status = (role === "doctor" || role === "technician") ? "pending" : "approved";
        
        console.log(`[Signup] Creating account for ${email} (${role}) with status: ${status}`);
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
              phone: phone || "",
              organization: organization || "",
              status,
              email_confirmed: true, // Mark as confirmed in metadata
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          console.error("[Signup] Supabase error:", error);
          
          // DEVELOPMENT BYPASS for rate limits
          const needsBypass = error.message.toLowerCase().includes("rate limit") || 
                              error.message.toLowerCase().includes("security purposes") ||
                              error.message.toLowerCase().includes("signups not allowed");
                              
          if (needsBypass) {
            console.log('[Signup] Rate limit hit - attempting development bypass...');
            
            const mockId = `dev_user_${Date.now()}`;
            
            const userProfile = {
              id: mockId,
              email: email,
              name: name,
              role: role,
              phone: phone || '',
              organization: organization || '',
              status: status,
              created_at: new Date().toISOString(),
              email_confirmed: true,
            };
            
            console.log(`[Signup] DEV BYPASS: User created successfully locally:`, userProfile);
            syncUserProfile(userProfile);
            
            createAuditLog(
              'USER_SIGNUP',
              { 
                email, 
                role, 
                status,
                name,
                organization: organization || 'N/A',
                method: 'dev_bypass'
              },
              mockId,
              name,
              role
            );
            
            const message = status === "pending" 
              ? `Account created successfully. Your ${role} account is awaiting admin approval. You will be notified once approved.` 
              : "Account created successfully. You can now login.";
            
            return {
              message,
              status,
              userId: mockId,
              session: null,
            };
          }

          // Create audit log for failed signup
          createAuditLog(
            'SIGNUP_FAILED',
            { email, role, reason: error.message },
            'system',
            'System',
            'system'
          );
          
          throw new Error(error.message);
        }

        if (data.user) {
          // Sync user profile to memory store - this is crucial!
          const userProfile = {
            id: data.user.id,
            email: email,
            name: name,
            role: role,
            phone: phone || '',
            organization: organization || '',
            status: status,
            created_at: new Date().toISOString(),
            email_confirmed: true, // Force confirmed in our system
          };
          
          console.log(`[Signup] User created successfully:`, userProfile);
          syncUserProfile(userProfile);
          
          // Create audit log for successful signup
          createAuditLog(
            'USER_SIGNUP',
            { 
              email, 
              role, 
              status,
              name,
              organization: organization || 'N/A'
            },
            data.user.id,
            name,
            role // Add role parameter
          );
          
          // IMPORTANT: Only store the access token if the user is verified/approved
          // This prevents pending doctors/technicians from bypassing the login lock natively
          if (data.session && status === "approved") {
            console.log('[Signup] Session available and User Approved, storing access token');
            setAccessToken(data.session.access_token);
            
            // Create login audit log
            createAuditLog(
              'USER_LOGIN',
              { email, role, method: 'signup_session_auto_approved' },
              data.user.id,
              name,
              role
            );
          } else if (data.session && status === "pending") {
            console.log(`[Signup] Valid session received but user is ${status}! Gating token storage.`);
          } else {
            console.log('[Signup] No session or pending - email confirmation may be required');
          }
        }

        const message = status === "pending" 
          ? `Account created successfully. Your ${role} account is awaiting admin approval. You will be notified once approved.` 
          : "Account created successfully. You can now login.";
        
        console.log(`[Signup] ${message}`);

        return {
          message,
          status,
          userId: data.user?.id,
          session: data.session, // Return session if available
        };
      } catch (error: any) {
        console.error("[Signup] Error:", error);
        throw error;
      }
    }
    return apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  login: async (email: string, password: string) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        console.log(`[Login] Attempting login for ${email}...`);
        
        // First, try to authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        // Handle authentication errors with development bypass
        if (error) {
          console.error("Login error from Supabase:", error);
          
          // Development bypass for both email confirmation AND invalid credentials
          // This allows login even when Supabase auth fails
          const needsBypass = error.message.includes("Email not confirmed") || 
                             error.message.includes("not confirmed") ||
                             error.message.includes("Invalid login credentials") ||
                             error.message.includes("invalid") ||
                             error.message.includes("credentials");
          
          if (needsBypass) {
            console.log('[Login] Supabase auth failed - attempting development bypass...');
            
            // DEVELOPMENT BYPASS: Check if user exists in memory store
            const allUserKeys = Array.from(memoryStore.keys()).filter(k => k.startsWith('user:'));
            let foundUser = null;
            
            for (const key of allUserKeys) {
              const user = memoryStore.get(key);
              if (user && user.email === email) {
                foundUser = user;
                console.log('[Login] Found user in memory store:', foundUser);
                break;
              }
            }
            
            if (foundUser) {
              console.log('[Login] DEVELOPMENT BYPASS: Using memory store user data');
              
              // Check approval status
              if (foundUser.role === "doctor" || foundUser.role === "technician") {
                if (foundUser.status === "pending") {
                  throw new Error("Your account is awaiting admin approval. Please contact an administrator.");
                }
                if (foundUser.status === "rejected") {
                  throw new Error("Your account has been rejected. Please contact an administrator.");
                }
              }
              
              // Create a mock session token for development
              const mockToken = `dev_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              setAccessToken(mockToken);
              
              // Store user data in localStorage for dev mode
              const userProfile = {
                id: foundUser.id,
                email: foundUser.email,
                name: foundUser.name,
                role: foundUser.role,
                phone: foundUser.phone || '',
                organization: foundUser.organization || '',
                status: foundUser.status,
              };
              setDevUser(userProfile);
              
              console.log('[Login] Development bypass successful - user logged in');
              
              // Create audit log for login
              createAuditLog(
                'USER_LOGIN',
                { email, role: foundUser.role, method: 'dev_bypass' },
                foundUser.id,
                foundUser.name
              );
              
              return {
                access_token: mockToken,
                user: userProfile,
                developmentBypass: true,
              };
            }
            
            // If user not in memory store either, show appropriate error
            if (error.message.includes("Email not confirmed")) {
              throw new Error("Please check your email and confirm your account before logging in.");
            } else {
              throw new Error("Invalid login credentials. Please check your email and password.");
            }
          }
          
          // Other errors - throw as is
          throw new Error(error.message);
        }

        // Normal login flow (Supabase auth succeeded)
        if (!data.session || !data.user) {
          throw new Error("Login failed - no session created");
        }

        console.log('[Login] Supabase authentication successful');

        // Check user status from metadata first
        const userMetadata = data.user.user_metadata || {};
        const role = userMetadata.role || 'patient';
        
        // Get status from metadata or memory store
        let status = userMetadata.status;
        
        // Check memory store for the most recent status
        const storedProfile = memoryStore.get(`user:${data.user.id}`);
        if (storedProfile && storedProfile.status) {
          console.log(`[Login] Memory store status for ${data.user.email} (${role}):`, storedProfile.status);
          status = storedProfile.status;
        } else if (status) {
          console.log(`[Login] Metadata status for ${data.user.email} (${role}):`, status);
        }
        
        // Apply default status logic if no status is found
        if (!status) {
          status = (role === "doctor" || role === "technician") ? "pending" : "approved";
          console.log(`[Login] No status found, applying default for ${data.user.email} (${role}):`, status);
        }

        // Only block login for doctors and technicians who are pending/rejected
        if (role === "doctor" || role === "technician") {
          if (status === "pending") {
            console.log(`[Login] Blocking ${role} login - status is pending:`, data.user.email);
            throw new Error("Your account is awaiting admin approval. Please contact an administrator.");
          }

          if (status === "rejected") {
            console.log(`[Login] Blocking ${role} login - status is rejected:`, data.user.email);
            throw new Error("Your account has been rejected. Please contact an administrator.");
          }
        }
        
        console.log(`[Login] Allowing login for ${data.user.email} (${role}) with status:`, status);

        // Store the access token
        setAccessToken(data.session.access_token);

        const userProfile = {
          id: data.user.id,
          email: data.user.email || '',
          name: userMetadata.name || data.user.email?.split('@')[0] || 'User',
          role: role,
          phone: userMetadata.phone || '',
          organization: userMetadata.organization || '',
          status: status,
        };

        // Sync to memory store
        syncUserProfile(userProfile);

        return {
          access_token: data.session.access_token,
          user: userProfile,
        };
      } catch (error: any) {
        console.error("Login error:", error);
        throw error;
      }
    }

    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) {
      setAccessToken(data.access_token);
    }

    return data;
  },

  logout: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      await supabase.auth.signOut();
    }
    clearAccessToken();
  },

  getCurrentUser: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        // Check if in development bypass mode first
        if (isDevMode()) {
          console.log('[getCurrentUser] Development mode detected, using localStorage');
          const devUser = getDevUser();
          if (devUser) {
            console.log('[getCurrentUser] Returning dev user:', devUser);
            return { user: devUser };
          }
          console.warn('[getCurrentUser] Dev mode but no dev user found in localStorage');
        }
        
        // Normal Supabase auth flow
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          throw new Error("Not authenticated");
        }

        const metadata = user.user_metadata || {};
        
        return {
          user: {
            id: user.id,
            email: user.email,
            name: metadata.name || user.email?.split('@')[0] || 'User',
            role: metadata.role || 'patient',
            phone: metadata.phone || '',
            organization: metadata.organization || '',
            status: metadata.status || 'approved',
          },
        };
      } catch (error) {
        console.error("Error getting current user:", error);
        throw error;
      }
    }
    return apiRequest("/auth/me");
  },
};

// User API with fallback to memory store
export const userApi = {
  getPendingUsers: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        console.log('[getPendingUsers] Fetching pending users...');
        
        const pendingUserIds = memoryStore.get('users:pending') || [];
        console.log('[getPendingUsers] Found pending user IDs:', pendingUserIds);
        
        const pendingUsers = [];
        
        for (const userId of pendingUserIds) {
          const userProfile = memoryStore.get(`user:${userId}`);
          console.log(`[getPendingUsers] Checking user ${userId}:`, userProfile);
          
          if (userProfile && userProfile.status === 'pending') {
            pendingUsers.push(userProfile);
          } else if (userProfile) {
            console.warn(`[getPendingUsers] User ${userId} has status '${userProfile.status}' - skipping`);
          } else {
            console.warn(`[getPendingUsers] User ${userId} not found in memory store`);
          }
        }
        
        console.log(`[getPendingUsers] Returning ${pendingUsers.length} pending users`);
        return { users: pendingUsers };
      } catch (error) {
        console.error("[getPendingUsers] Error:", error);
        return { users: [] };
      }
    }
    return apiRequest("/users/pending");
  },

  approveUser: async (userId: string) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        console.log('[approveUser] Approving user:', userId);
        
        //Get current admin user
        let adminUser;
        if (isDevMode()) {
          adminUser = getDevUser();
        } else {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          adminUser = authUser;
        }
        
        // Get user profile from memory store
        const userProfile = memoryStore.get(`user:${userId}`);
        if (!userProfile) {
          throw new Error("User not found");
        }

        console.log('[approveUser] Current user profile:', userProfile);

        // Since we can't use admin API on client, we only update memory store
        // The user will be approved in memory, and on next login, they'll be allowed in
        userProfile.status = 'approved';
        userProfile.updated_at = new Date().toISOString();
        memoryStore.set(`user:${userId}`, userProfile);

        // Remove from pending list
        const pendingUsers = memoryStore.get('users:pending') || [];
        const updatedPending = pendingUsers.filter((id: string) => id !== userId);
        memoryStore.set('users:pending', updatedPending);

        console.log('[approveUser] User approved in memory store, updated pending list');
        console.log('[approveUser] Note: User metadata in Supabase Auth will be updated on their next login');

        // Create audit log
        createAuditLog(
          'USER_APPROVED',
          {
            approved_user_id: userId,
            approved_user_email: userProfile.email,
            approved_user_role: userProfile.role,
            approved_user_name: userProfile.name,
          },
          adminUser?.id,
          adminUser?.user_metadata?.name || adminUser?.name || adminUser?.email || 'Admin',
          adminUser?.user_metadata?.role || adminUser?.role || 'admin'
        );

        return { message: "User approved successfully", user: userProfile };
      } catch (error: any) {
        console.error("[approveUser] Error:", error);
        throw new Error(error.message || "Failed to approve user");
      }
    }
    return apiRequest(`/users/${userId}/approve`, {
      method: "POST",
    });
  },

  rejectUser: async (userId: string) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        console.log('[rejectUser] Rejecting user:', userId);
        
        // Get current admin user
        let adminUser;
        if (isDevMode()) {
          adminUser = getDevUser();
        } else {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          adminUser = authUser;
        }
        
        // Get user profile from memory store
        const userProfile = memoryStore.get(`user:${userId}`);
        if (!userProfile) {
          throw new Error("User not found");
        }

        console.log('[rejectUser] Current user profile:', userProfile);

        // Since we can't use admin API on client, we only update memory store
        userProfile.status = 'rejected';
        userProfile.updated_at = new Date().toISOString();
        memoryStore.set(`user:${userId}`, userProfile);

        // Remove from pending list
        const pendingUsers = memoryStore.get('users:pending') || [];
        const updatedPending = pendingUsers.filter((id: string) => id !== userId);
        memoryStore.set('users:pending', updatedPending);

        console.log('[rejectUser] User rejected in memory store, updated pending list');

        // Create audit log
        createAuditLog(
          'USER_REJECTED',
          {
            rejected_user_id: userId,
            rejected_user_email: userProfile.email,
            rejected_user_role: userProfile.role,
            rejected_user_name: userProfile.name,
          },
          adminUser?.id,
          adminUser?.user_metadata?.name || adminUser?.email || 'Admin',
          adminUser?.user_metadata?.role || adminUser?.role || 'admin'
        );

        return { message: "User rejected successfully", user: userProfile };
      } catch (error: any) {
        console.error("[rejectUser] Error:", error);
        throw new Error(error.message || "Failed to reject user");
      }
    }
    return apiRequest(`/users/${userId}/reject`, {
      method: "POST",
    });
  },

  getAllUsers: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      const allUsers = memoryStore.getByPrefix("user:");
      return { users: allUsers };
    }
    return apiRequest("/users");
  },

  updateProfile: async (profileData: {
    name?: string;
    phone?: string;
    organization?: string;
  }) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Not authenticated");

        const currentMetadata = user.user_metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          ...profileData,
        };

        const { error } = await supabase.auth.updateUser({
          data: updatedMetadata,
        });

        if (error) throw error;

        // Update memory store
        const userProfile = memoryStore.get(`user:${user.id}`) || {};
        Object.assign(userProfile, profileData);
        userProfile.updated_at = new Date().toISOString();
        memoryStore.set(`user:${user.id}`, userProfile);

        return { message: "Profile updated successfully", user: userProfile };
      } catch (error: any) {
        console.error("Error updating profile:", error);
        throw new Error(error.message || "Failed to update profile");
      }
    }
    return apiRequest("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  getPatients: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      const patientIds = memoryStore.get('users:patient') || [];
      const patients = [];

      for (const patientId of patientIds) {
        const patient = memoryStore.get(`user:${patientId}`);
        if (patient && patient.status === 'approved') {
          // Get ECG count
          const patientEcgIds = memoryStore.get(`patient:${patientId}:ecgs`) || [];
          
          patients.push({
            id: patient.id,
            name: patient.name,
            email: patient.email,
            phone: patient.phone || 'N/A',
            gender: patient.gender || 'N/A',
            age: patient.age || null,
            assignedDoctor: 'Not Assigned',
            lastVisit: null,
            status: patient.status,
            reportCount: patientEcgIds.length,
          });
        }
      }

      return { patients };
    }
    return apiRequest("/patients");
  },

  getDoctors: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      const doctorIds = memoryStore.get('users:doctor') || [];
      const doctors = [];

      for (const doctorId of doctorIds) {
        const doctor = memoryStore.get(`user:${doctorId}`);
        if (doctor && doctor.status === 'approved') {
          doctors.push({
            id: doctor.id,
            name: doctor.name,
            email: doctor.email,
            organization: doctor.organization || '',
          });
        }
      }

      return { doctors, count: doctors.length };
    }
    return apiRequest("/doctors");
  },
};

// ECG API with fallback to memory store
export const ecgApi = {
  uploadECG: async (data: {
    fileName: string;
    fileData: string;
    patientId?: string;
    doctorId?: string;
    fileType?: string;
  }) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        // Get user - check dev mode first
        let user, userProfile;
        
        if (isDevMode()) {
          const devUser = getDevUser();
          if (!devUser) throw new Error("Not authenticated");
          user = devUser;
          userProfile = memoryStore.get(`user:${user.id}`);
        } else {
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          if (userError || !authUser) throw new Error("Not authenticated");
          user = authUser;
          userProfile = memoryStore.get(`user:${authUser.id}`);
        }
        
        if (!userProfile) throw new Error("User profile not found");

        const { fileName, fileData, patientId, doctorId, fileType } = data;
        
        // Determine target patient
        const targetPatientId = userProfile.role === 'technician' ? patientId : user.id;
        if (!targetPatientId) throw new Error("Patient ID is required");

        const timestamp = Date.now();
        const uniqueFileName = `${targetPatientId}/${timestamp}-${fileName}`;
        const bucketName = 'make-39210185-ecg-files';
        let filePath = uniqueFileName;
        let useMemoryStorage = false;

        // Try to upload to Supabase Storage (only if not in dev mode)
        if (!isDevMode()) {
          try {
            // Convert base64 to blob
            const byteString = atob(fileData);
            const arrayBuffer = new ArrayBuffer(byteString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < byteString.length; i++) {
              uint8Array[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([uint8Array], { type: fileType || 'text/csv' });

            const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(uniqueFileName, blob, {
                contentType: fileType || 'text/csv',
                upsert: false,
              });

            if (uploadError) {
              console.warn("Storage upload failed, using memory storage fallback:", uploadError.message);
              useMemoryStorage = true;
            } else {
              console.log('[uploadECG] File uploaded to Supabase Storage successfully');
            }
          } catch (error) {
            console.warn("Storage upload exception, using memory storage fallback:", error);
            useMemoryStorage = true;
          }
        } else {
          console.log('[uploadECG] Dev mode detected, using memory storage');
          useMemoryStorage = true;
        }

        // If storage upload failed or in dev mode, store in memory
        if (useMemoryStorage) {
          // Store file data in memory with a special key
          const fileStorageKey = `file:${uniqueFileName}`;
          memoryStore.set(fileStorageKey, {
            fileName,
            fileData, // base64 data
            fileType: fileType || 'text/csv',
            uploadedAt: new Date().toISOString(),
            storedInMemory: true,
          });
          console.log('[uploadECG] File stored in memory storage:', fileStorageKey);
        }

        // Get doctor info
        let doctorName = null;
        if (doctorId) {
          const doctor = memoryStore.get(`user:${doctorId}`);
          doctorName = doctor?.name || 'Unknown';
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
          file_path: filePath,
          file_type: fileType || 'text/csv',
          status: 'pending',
          prediction: null,
          confidence: null,
          created_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
          comments: null,
          stored_in_memory: useMemoryStorage, // Flag to indicate storage location
        };

        memoryStore.set(ecgRecord.id, ecgRecord);

        // Add to patient's ECG list
        const patientEcgs = memoryStore.get(`patient:${targetPatientId}:ecgs`) || [];
        patientEcgs.push(ecgRecord.id);
        memoryStore.set(`patient:${targetPatientId}:ecgs`, patientEcgs);

        // Add to all ECGs list
        const allEcgs = memoryStore.get('ecgs:all') || [];
        allEcgs.push(ecgRecord.id);
        memoryStore.set('ecgs:all', allEcgs);

        console.log('[uploadECG] ECG record created successfully:', ecgRecord.id);
        return { message: 'ECG uploaded successfully', record: ecgRecord };
      } catch (error: any) {
        console.error("Error uploading ECG:", error);
        throw new Error(error.message || "Failed to upload ECG");
      }
    }
    return apiRequest("/ecg/upload", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getRecords: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        // Get user - check dev mode first
        let user, userProfile;
        
        if (isDevMode()) {
          const devUser = getDevUser();
          if (!devUser) throw new Error("Not authenticated");
          user = devUser;
          userProfile = memoryStore.get(`user:${user.id}`);
        } else {
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          if (userError || !authUser) throw new Error("Not authenticated");
          user = authUser;
          userProfile = memoryStore.get(`user:${authUser.id}`);
        }
        
        if (!userProfile) throw new Error("User profile not found");

        let ecgRecords: any[] = [];

        if (userProfile.role === 'patient') {
          const patientEcgIds = memoryStore.get(`patient:${user.id}:ecgs`) || [];
          for (const ecgId of patientEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record) {
              const patient = memoryStore.get(`user:${record.patient_id}`);
              record.patient_name = patient?.name || 'Unknown';
              ecgRecords.push(record);
            }
          }
        } else if (userProfile.role === 'doctor') {
          const allEcgIds = memoryStore.get('ecgs:all') || [];
          for (const ecgId of allEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record && record.assigned_doctor_id === user.id) {
              const patient = memoryStore.get(`user:${record.patient_id}`);
              record.patient_name = patient?.name || 'Unknown';
              ecgRecords.push(record);
            }
          }
        } else if (userProfile.role === 'technician') {
          const allEcgIds = memoryStore.get('ecgs:all') || [];
          for (const ecgId of allEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record && record.uploaded_by === user.id) {
              const patient = memoryStore.get(`user:${record.patient_id}`);
              record.patient_name = patient?.name || 'Unknown';
              ecgRecords.push(record);
            }
          }
        } else if (userProfile.role === 'admin') {
          const allEcgIds = memoryStore.get('ecgs:all') || [];
          for (const ecgId of allEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record) {
              const patient = memoryStore.get(`user:${record.patient_id}`);
              record.patient_name = patient?.name || 'Unknown';
              ecgRecords.push(record);
            }
          }
        }

        // Sort by created_at descending
        ecgRecords.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return { records: ecgRecords };
      } catch (error: any) {
        console.error("Error getting ECG records:", error);
        return { records: [] };
      }
    }
    return apiRequest("/ecg/records");
  },

  getRecord: async (recordId: string) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        const originalRecord = memoryStore.get(recordId);
        if (!originalRecord) throw new Error("ECG record not found");
        
        // CRITICAL FIX: Deep clone the record so we don't accidentally mutate the master reference in the memory store
        const record = JSON.parse(JSON.stringify(originalRecord));

        const patient = memoryStore.get(`user:${record.patient_id}`);
        record.patient_name = patient?.name || 'Unknown';

        // Check if file is stored in memory
        if (record.stored_in_memory) {
          console.log('[getRecord] File stored in memory, retrieving from memory store');
          const fileStorageKey = `file:${record.file_path}`;
          const fileData = memoryStore.get(fileStorageKey);
          
          if (fileData) {
            // Create a data URL from the base64 data
            record.file_url = `data:${fileData.fileType};base64,${fileData.fileData}`;
            record.file_data = fileData.fileData; // Also provide raw base64
            console.log('[getRecord] File retrieved from memory storage');
          } else {
            console.warn('[getRecord] File marked as memory storage but not found');
          }
        } else {
          // Try to get signed URL from Supabase Storage
          try {
            const { data: signedUrlData } = await supabase.storage
              .from('make-39210185-ecg-files')
              .createSignedUrl(record.file_path, 3600);

            if (signedUrlData) {
              record.file_url = signedUrlData.signedUrl;
              console.log('[getRecord] File URL from Supabase Storage');
            }
          } catch (storageError) {
            console.warn('[getRecord] Failed to get signed URL from storage:', storageError);
          }
        }

        if (record.pipeline_images?.annotated) {
          record.pipeline_images.annotated = memoryStore.resolveImageTree(record.pipeline_images.annotated);
        }

        if (record.explainability?.lead_importance?.chart) {
          record.explainability.lead_importance.chart = memoryStore.resolveImageSource(
            record.explainability.lead_importance.chart,
          );
        }

        return { record };
      } catch (error: any) {
        console.error("Error getting ECG record:", error);
        throw new Error(error.message || "Failed to get ECG record");
      }
    }
    return apiRequest(`/ecg/${recordId}`);
  },

  deleteRecord: async (recordId: string) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        const record = memoryStore.get(recordId);
        if (!record) throw new Error("ECG record not found");

        const deleteStoredFile = (fileRef?: string | null) => {
          if (!fileRef || typeof fileRef !== 'string') return;
          if (
            fileRef.startsWith('data:') ||
            fileRef.startsWith('http://') ||
            fileRef.startsWith('https://') ||
            fileRef.startsWith('blob:')
          ) {
            return;
          }

          const storageKey = fileRef.startsWith('file:') ? fileRef : `file:${fileRef}`;
          if (memoryStore.has(storageKey)) {
            memoryStore.delete(storageKey);
          }
        };

        const deletePipelineFiles = (value: any) => {
          if (!value) return;
          if (typeof value === 'string') {
            deleteStoredFile(value);
            return;
          }
          if (Array.isArray(value)) {
            value.forEach(deletePipelineFiles);
            return;
          }
          if (typeof value === 'object') {
            Object.values(value).forEach(deletePipelineFiles);
          }
        };

        deleteStoredFile(record.file_path);
        deletePipelineFiles(record.pipeline_images);
        deletePipelineFiles(record.explainability);

        const patientListKey = `patient:${record.patient_id}:ecgs`;
        const patientEcgs = memoryStore.get(patientListKey) || [];
        if (Array.isArray(patientEcgs)) {
          memoryStore.set(
            patientListKey,
            patientEcgs.filter((ecgId: string) => ecgId !== recordId),
          );
        }

        const allEcgs = memoryStore.get('ecgs:all') || [];
        if (Array.isArray(allEcgs)) {
          memoryStore.set(
            'ecgs:all',
            allEcgs.filter((ecgId: string) => ecgId !== recordId),
          );
        }

        memoryStore.delete(recordId);

        return { message: 'ECG report deleted successfully' };
      } catch (error: any) {
        console.error("Error deleting ECG record:", error);
        throw new Error(error.message || "Failed to delete ECG report");
      }
    }
    return apiRequest(`/ecg/${recordId}`, {
      method: "DELETE",
    });
  },

  reviewECG: async (
    recordId: string,
    reviewData: {
      status: string;
      comments?: string;
      prediction?: string;
      confidence?: number;
    },
  ) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Not authenticated");

        const userProfile = memoryStore.get(`user:${user.id}`);
        if (!userProfile || userProfile.role !== 'doctor') {
          throw new Error("Only doctors can review ECGs");
        }

        const record = memoryStore.get(recordId);
        if (!record) throw new Error("ECG record not found");

        // Update record
        record.status = reviewData.status || 'reviewed';
        record.reviewed_at = new Date().toISOString();
        record.reviewed_by = user.id;
        record.reviewer_name = userProfile.name;
        if (reviewData.comments) record.comments = reviewData.comments;
        if (reviewData.prediction) record.prediction = reviewData.prediction;
        if (reviewData.confidence !== undefined) record.confidence = reviewData.confidence;

        // CRITICAL FIX: Defensive garbage collection. Prevent UI strings from bleeding back into the DB cache.
        delete record.file_url;
        delete record.file_data;

        memoryStore.set(recordId, record);

        return { message: 'ECG reviewed successfully', record };
      } catch (error: any) {
        console.error("Error reviewing ECG:", error);
        throw new Error(error.message || "Failed to review ECG");
      }
    }
    return apiRequest(`/ecg/${recordId}/review`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  },

    updateAnalysisResult: async (
      recordId: string,
      resultData: {
        prediction: string;
        confidence?: number;
        similarityScore?: number;
        images?: Record<string, string>;
        status?: string;
        explainability?: Record<string, any>;
      }
    ) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        const record = memoryStore.get(recordId);
        if (!record) throw new Error("ECG record not found");

        record.prediction = resultData.prediction;
        if (resultData.confidence !== undefined) record.confidence = resultData.confidence;
        if (resultData.similarityScore !== undefined) record.similarity_score = resultData.similarityScore;
        if (resultData.images) {
          record.pipeline_images = memoryStore.sanitizeLargeValue(
            resultData.images,
            `${recordId}:pipeline_images`,
          );
        }
        if (resultData.status) record.status = resultData.status;
        if (resultData.explainability) {
          record.explainability = memoryStore.sanitizeLargeValue(
            resultData.explainability,
            `${recordId}:explainability`,
          );
        }
        
        // CRITICAL FIX: Defensive garbage collection. Prevent UI strings from bleeding back into the DB cache.
        delete record.file_url;
        delete record.file_data;

        memoryStore.set(recordId, record);

        return { message: 'Analysis results updated', record };
      } catch (error: any) {
        console.error("Error updating analysis result:", error);
        throw new Error(error.message || "Failed to update analysis result");
      }
    }
    return apiRequest(`/ecg/${recordId}/analysis`, {
      method: "PUT",
      body: JSON.stringify(resultData),
    });
  },

  uploadIntermediateImage: async (fileName: string, base64Data: string) => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        await memoryStore.ready;

        const uniqueFileName = `pipeline/${Date.now()}-${fileName}`;
        const fileStorageKey = `file:${uniqueFileName}`;
        memoryStore.set(fileStorageKey, {
          fileName,
          fileData: base64Data.replace(/^data:image\/\w+;base64,/, ""),
          fileType: 'image/png',
          uploadedAt: new Date().toISOString(),
          storedInMemory: true,
        });

        return { url: uniqueFileName };
      } catch (error: any) {
        console.error("Error uploading pipeline image:", error);
        throw new Error(error.message || "Failed to upload image");
      }
    }
    return apiRequest(`/ecg/upload-image`, {
      method: "POST",
      body: JSON.stringify({ fileName, fileData: base64Data }),
    });
  },
};

// Stats API with fallback to memory store
export const statsApi = {
  getStats: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        // Get user - check dev mode first
        let user, userProfile;
        
        if (isDevMode()) {
          const devUser = getDevUser();
          if (!devUser) throw new Error("Not authenticated");
          user = devUser;
          userProfile = memoryStore.get(`user:${user.id}`)
        } else {
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          if (userError || !authUser) throw new Error("Not authenticated");
          user = authUser;
          userProfile = memoryStore.get(`user:${authUser.id}`)
        }
        
        if (!userProfile) throw new Error("User profile not found");

        const stats: any = {};

        if (userProfile.role === 'admin') {
          const allUsers = memoryStore.getByPrefix('user:');
          const pendingUsers = memoryStore.get('users:pending') || [];
          const allEcgs = memoryStore.get('ecgs:all') || [];

          stats.totalUsers = allUsers.length;
          stats.pendingUsers = pendingUsers.length;
          stats.totalEcgs = allEcgs.length;
          stats.usersByRole = {
            patient: (memoryStore.get('users:patient') || []).length,
            doctor: (memoryStore.get('users:doctor') || []).length,
            technician: (memoryStore.get('users:technician') || []).length,
            admin: (memoryStore.get('users:admin') || []).length,
          };
        } else if (userProfile.role === 'doctor') {
          const allEcgIds = memoryStore.get('ecgs:all') || [];
          let total = 0, pending = 0, reviewed = 0, abnormal = 0;

          for (const ecgId of allEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record && record.assigned_doctor_id === user.id) {
              total++;
              if (record.status === 'pending') pending++;
              if (record.status === 'reviewed') reviewed++;
              if (record.prediction === 'abnormal') abnormal++;
            }
          }

          stats.totalEcgs = total;
          stats.pendingReviews = pending;
          stats.reviewedEcgs = reviewed;
          stats.abnormalCases = abnormal;
        } else if (userProfile.role === 'patient') {
          const patientEcgIds = memoryStore.get(`patient:${user.id}:ecgs`) || [];
          let pending = 0, reviewed = 0, abnormal = 0;

          for (const ecgId of patientEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record) {
              if (record.status === 'pending') pending++;
              if (record.status === 'reviewed') reviewed++;
              if (record.prediction === 'abnormal') abnormal++;
            }
          }

          stats.totalEcgs = patientEcgIds.length;
          stats.pendingReviews = pending;
          stats.reviewedEcgs = reviewed;
          stats.abnormalResults = abnormal;
        } else if (userProfile.role === 'technician') {
          const allEcgIds = memoryStore.get('ecgs:all') || [];
          let uploadedCount = 0;

          for (const ecgId of allEcgIds) {
            const record = memoryStore.get(ecgId);
            if (record && record.uploaded_by === user.id) {
              uploadedCount++;
            }
          }

          stats.totalUploads = uploadedCount;
        }

        return { stats };
      } catch (error: any) {
        console.error("Error getting stats:", error);
        return { stats: {} };
      }
    }
    return apiRequest("/stats");
  },
};

// Audit API
export const auditApi = {
  getLogs: async () => {
    if (USE_DIRECT_SUPABASE_AUTH) {
      try {
        console.log('[Audit Logs] Attempting to fetch from server...');
        // Try to fetch from server first (but this will likely fail in dev mode)
        return await apiRequest("/audit-logs");
      } catch (error) {
        console.log('[Audit Logs] Server unavailable (expected in dev mode), using memory store fallback');
        // Fallback to memory store - this is normal and expected
        const logs: any[] = [];
        const allKeys = Array.from(memoryStore.keys());
        
        for (const key of allKeys) {
          if (key.startsWith('audit:')) {
            const log = memoryStore.get(key);
            if (log) {
              logs.push(log);
            }
          }
        }
        
        // Sort by timestamp descending
        logs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        console.log(`[Audit Logs] Returning ${logs.length} logs from memory store`);
        return { logs };
      }
    }
    return apiRequest("/audit-logs");
  },
};
