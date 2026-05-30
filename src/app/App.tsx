import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./context/ThemeContext";
import { TranscriptProvider } from "./context/TranscriptContext";

export default function App() {
  return (
    <ThemeProvider>
      <TranscriptProvider>
        <RouterProvider router={router} />
      </TranscriptProvider>
    </ThemeProvider>
  );
}
