import { createRoot } from "react-dom/client";
import "./index.css";
import { AuthProvider } from "./hooks/use-auth";
import { AppProvider } from "./context/app-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);
