import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./index.css";
import { HomePage } from "./routes/home";

const queryClient = new QueryClient();

const router = createBrowserRouter([{ path: "/", element: <HomePage /> }]);

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("#root が見つかりません");
}

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
