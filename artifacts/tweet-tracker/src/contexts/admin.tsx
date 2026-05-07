import { createContext, useContext, useState } from "react";

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

export const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: async () => false,
  logout: () => {},
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("admin_auth") === "true");

  const login = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/tweets/admin-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
      });
      if (res.ok) {
        sessionStorage.setItem("admin_auth", "true");
        sessionStorage.setItem("admin_password", password);
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_password");
    setIsAdmin(false);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function getAdminHeaders(): Record<string, string> {
  const password = sessionStorage.getItem("admin_password");
  return password ? { "x-admin-password": password } : {};
}
