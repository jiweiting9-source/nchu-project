import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { CreditCalculator } from "./components/CreditCalculator";
import { CourseAnalysis } from "./components/CourseAnalysis";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: RootLayout,
      children: [
        { index: true, Component: CreditCalculator },
        { path: "course-analysis", Component: CourseAnalysis },
      ],
    },
  ],
  {
    basename: "/nchu-project",
  }
);