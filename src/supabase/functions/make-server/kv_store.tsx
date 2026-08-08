// Simple in-memory KV store for Supabase Edge Functions
// This is a basic implementation - in production, you'd use a proper database

const store = new Map<string, any>();

export const set = async (
  key: string,
  value: any,
): Promise<void> => {
  store.set(key, value);
};

export const get = async (key: string): Promise<any> => {
  return store.get(key) || null;
};

export const del = async (key: string): Promise<void> => {
  store.delete(key);
};

export const getByPrefix = async (
  prefix: string,
): Promise<any[]> => {
  const results: any[] = [];
  for (const [key, value] of store.entries()) {
    if (key.startsWith(prefix)) {
      results.push(value);
    }
  }
  return results;
};

export const has = async (key: string): Promise<boolean> => {
  return store.has(key);
};
