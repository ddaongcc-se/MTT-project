import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";

export default function ProtectedLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const serviceUrl = sessionStorage.getItem("serviceUrl");
      if (!serviceUrl) {
        navigate("/service-connection");
      }
    }
  }, [navigate]);

  return <Outlet />;
}
