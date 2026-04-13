import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ServiceContextType {
  serviceUrl: string | null;
  setServiceUrl: (url: string) => void;
  clearServiceUrl: () => void;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [serviceUrl, setServiceUrlState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("serviceUrl");
    }
    return null;
  });

  const setServiceUrl = (url: string) => {
    const normalizedUrl = url.startsWith("http") ? url : `http://${url}`;
    setServiceUrlState(normalizedUrl);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("serviceUrl", normalizedUrl);
    }
  };

  const clearServiceUrl = () => {
    setServiceUrlState(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("serviceUrl");
    }
  };

  return (
    <ServiceContext.Provider value={{ serviceUrl, setServiceUrl, clearServiceUrl }}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useService() {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error("useService must be used within a ServiceProvider");
  }
  return context;
}
