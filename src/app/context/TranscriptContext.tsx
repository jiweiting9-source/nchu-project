import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultUserPlans, type RequirementPlan } from "../data/requirements";

export interface TranscriptCourse {
  courseNo: string;
  name: string;
  semester: string;
  credits: number;
  score: string;
  grade: string;
  type: string;
  typeLabel: string;
  category: string;
  offeredBy: string;
  emi: boolean;
  genEdProfessorFromMajorDepartment: boolean;
  planId: string;
}

export interface TranscriptProfile {
  name: string;
  department: string;
  studentStatus: "local" | "foreign";
  admissionYear: number;
}

interface TranscriptContextType {
  courses: TranscriptCourse[];
  profile: TranscriptProfile;
  rawText: string;
  plans: RequirementPlan[];
  setTranscript: (data: {
    courses: TranscriptCourse[];
    profile: TranscriptProfile;
    rawText: string;
    plans?: RequirementPlan[];
  }) => void;
  setPlans: (plans: RequirementPlan[]) => void;
  clearTranscript: () => void;
}

const emptyProfile: TranscriptProfile = { name: "", department: "", studentStatus: "local", admissionYear: 111 };
const defaultPlans: RequirementPlan[] = defaultUserPlans;

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<TranscriptCourse[]>([]);
  const [profile, setProfile] = useState<TranscriptProfile>({ ...emptyProfile, department: "外國語文學系" });
  const [rawText, setRawText] = useState("");
  const [plans, setPlans] = useState<RequirementPlan[]>(defaultPlans);

  const value = useMemo<TranscriptContextType>(
    () => ({
      courses,
      profile,
      rawText,
      plans,
      setTranscript: (data) => {
        setCourses(data.courses);
        setProfile(data.profile);
        setRawText(data.rawText);
        if (data.plans) setPlans(data.plans);
      },
      setPlans,
      clearTranscript: () => {
        setCourses([]);
        setProfile(emptyProfile);
        setRawText("");
        setPlans(defaultPlans);
      },
    }),
    [courses, profile, rawText, plans],
  );

  return <TranscriptContext.Provider value={value}>{children}</TranscriptContext.Provider>;
}

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}
