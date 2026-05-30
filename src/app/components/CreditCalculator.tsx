import { Calculator, ClipboardPaste, Download, GraduationCap, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranscript, type TranscriptCourse } from "../context/TranscriptContext";
import {
  allDepartments,
  defaultPlanId,
  departmentCredits,
  digitalHumanitiesProgramCourses,
  digitalHumanitiesProgramId,
  digitalHumanitiesProgramRecognizedCourses,
  getRequirementProfile,
  optionalProgramPlans,
  planTypeLabels,
  type ChoiceCreditRequirement,
  type RequirementPlan,
  type RequirementProfile,
  type RequirementPlanType,
} from "../data/requirements";

const categoryOptions = [
  "人文領域",
  "社會科學領域",
  "自然科學領域",
  "統合領域",
  "核心素養",
  "資訊素養",
  "語言素養課程",
  "國防教育",
  "共同必修/通識",
  "體育/服務學習",
  "專業課程",
  "其他",
];

const fallbackRequirementProfile = getRequirementProfile("外國語文學系");
const dfllDepartmentName = "外國語文學系";
const dfllGeneralEdOverflowExternalLimit = 10;

const dfllDigitalHumanitiesCourses = [
  "數位人文概論",
  "影像處理與電腦繪畫",
  "網頁設計",
  "數位敘事應用",
  "數位內容策展",
  "數位人文GIS應用",
  "程式設計與人文應用",
];

const dfllCollegeEmiCourses = ["歷史與電影", "文化臺中", "飲食與文化", "台灣語言與文化", "歐洲現代史導讀"];

const dfllRequiredProfessionalCourses = [
  { name: "英語口語訓練(一)", requiredCredits: 4, aliases: ["英語口語訓練（一）", "英語口語訓練(一)"] },
  { name: "英語口語訓練(二)", requiredCredits: 4, aliases: ["英語口語訓練（二）", "英語口語訓練(二)"] },
  { name: "英文作文(一)", requiredCredits: 4, aliases: ["英文作文（一）", "英文作文(一)"] },
  { name: "英文作文(二)", requiredCredits: 4, aliases: ["英文作文（二）", "英文作文(二)"] },
  { name: "文學作品讀法", requiredCredits: 4, aliases: ["文學作品讀法"] },
  { name: "西洋文學概論", requiredCredits: 4, aliases: ["西洋文學概論"] },
  { name: "語言學概論", requiredCredits: 4, aliases: ["語言學概論"] },
];

const dfllBritishAmericanLiteratureCourses = [
  "英國文學:中古與文藝復興時期",
  "英國文學:復辟與新古典時期",
  "英國文學:浪漫與維多利亞時期",
  "英國文學:二十世紀迄今",
  "美國文學:二十世紀前",
  "美國文學:二十世紀迄今",
];

const fullYearCourseAliases = [
  ...dfllRequiredProfessionalCourses.flatMap((course) => course.aliases),
  "大學國文",
  "大一英文",
];
const firstSupportedAdmissionYear = 111;
const supportedAdmissionYears = [111, 112, 113, 114, 115, 116];

const getSemesterOptions = (admissionYear: number) =>
  Array.from({ length: 4 }, (_, yearOffset) => admissionYear + yearOffset).flatMap((year) => [`${year}-1`, `${year}-2`]);

const getSemesterTerm = (semester: string) => semester.match(/-(1|2)$/)?.[1] ?? "";

const getCourseChronology = (course: Pick<TranscriptCourse, "semester">) => {
  const match = course.semester.match(/^(\d{3})-(1|2)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 10 + Number(match[2]);
};

const sortCoursesChronologically = <T extends Pick<TranscriptCourse, "semester">>(items: T[]) =>
  [...items].sort((a, b) => getCourseChronology(a) - getCourseChronology(b));

const isFullYearCourseName = (name: string) => matchesAnyName(name, fullYearCourseAliases);

const isWithdrawnCourse = (course: Pick<TranscriptCourse, "score" | "grade">) =>
  course.score.toUpperCase() === "W" || course.grade.toUpperCase() === "W";

const isFailedCourse = (course: Pick<TranscriptCourse, "grade">) => course.grade.toUpperCase() === "F";

const isUncountedOutcomeCourse = (course: Pick<TranscriptCourse, "score" | "grade">) =>
  isWithdrawnCourse(course) || isFailedCourse(course);

const getScoreDisplay = (course: Pick<TranscriptCourse, "score" | "grade">) => {
  if (isWithdrawnCourse(course)) return "退選，不採計學分";
  if (isFailedCourse(course)) return "不及格，不採計學分";
  return course.score;
};

const getFullYearCompletedCredits = (courses: TranscriptCourse[], aliases: string[], requiredCredits: number, profile: RequirementProfile) => {
  const perTermCap = requiredCredits / 2;
  const termCredits = { "1": 0, "2": 0 } as Record<string, number>;
  for (const course of courses) {
    if (!matchesAnyName(course.name, aliases)) continue;
    const term = getSemesterTerm(course.semester);
    if (term === "1" || term === "2") {
      termCredits[term] += countableCredits(course, profile);
    }
  }
  return Math.min(termCredits["1"], perTermCap) + Math.min(termCredits["2"], perTermCap);
};

const emptyCourse = (): TranscriptCourse => ({
  courseNo: "",
  semester: "",
  name: "",
  credits: 0,
  score: "",
  grade: "",
  type: "",
  typeLabel: "",
  category: "其他",
  offeredBy: "",
  emi: false,
  genEdProfessorFromMajorDepartment: false,
  planId: defaultPlanId,
});

const normalizeGrade = (value: string) => value.trim().toUpperCase().replace("＋", "+").replace("－", "-");

const inferCategory = (name: string, profile: RequirementProfile = fallbackRequirementProfile, offeredBy = "") => {
  if (profile.languageLiteracyRequirements.some((requirement) => compactCourseText(name).includes(compactCourseText(requirement.name)))) return "語言素養課程";
  if (/(國防|全民國防|軍訓)/.test(name)) return "國防教育";
  if (/(體育|服務)/.test(name)) return "體育/服務學習";
  if (isDfllProfile(profile) && dfllRequiredProfessionalCourses.some((course) => matchesAnyName(name, course.aliases))) return "專業課程";
  if (isDfllProfile(profile) && matchesAnyName(name, dfllBritishAmericanLiteratureCourses)) return "專業課程";
  if (isDfllProfile(profile) && matchesAnyName(name, dfllDigitalHumanitiesCourses)) return "專業課程";
  if (isDfllProfile(profile) && matchesAnyName(name, dfllCollegeEmiCourses)) return "專業課程";
  if (isDfllProfile(profile) && offeredBy && /(數位人文|Digital\s*Humanities)/i.test(name) && /(文學院|CollegeofLiberalArts)/i.test(compactCourseText(offeredBy))) return "專業課程";
  if (offeredBy && profile.homeDepartmentPatterns.some((pattern) => pattern.test(compactCourseText(offeredBy)))) return "專業課程";
  if (profile.choiceCreditRequirements.some((requirement) => requirement.options.some((option) => option.pattern.test(name)))) return "專業課程";
  if (/(通識|共同|語文)/.test(name)) return "共同必修/通識";
  return "其他";
};

const categorySummaryKey = (category: string, profile: RequirementProfile = fallbackRequirementProfile) => {
  if (category === "體育") return profile.nonGraduationRequirement?.category ?? "體育/服務學習";
  if (["人文領域", "社會科學領域", "自然科學領域", "統合領域", "核心素養", "資訊素養", "語言素養課程", "國防教育"].includes(category)) {
    return category;
  }
  if (categoryOptions.includes(category)) return category;
  return "其他";
};

const typeLabels: Record<string, string> = {
  必: "必修",
  選: "選修",
  通: "通識",
  體: "體育",
  服: "服務學習",
};

const getCourseCategory = (course: Pick<TranscriptCourse, "category" | "name" | "offeredBy" | "type">, profile: RequirementProfile = fallbackRequirementProfile) => {
  if (course.type === "體" || course.type === "服") return profile.nonGraduationRequirement?.category ?? "體育/服務學習";
  return categorySummaryKey(course.category || inferCategory(course.name, profile, course.offeredBy), profile);
};

const countableCredits = (course: Pick<TranscriptCourse, "category" | "credits" | "grade" | "name" | "score" | "type">, profile: RequirementProfile = fallbackRequirementProfile) =>
  isUncountedOutcomeCourse(course) || profile.nonGraduationCreditCategories.includes(getCourseCategory(course, profile)) ? 0 : course.credits;

const getDuplicateKey = (course: Pick<TranscriptCourse, "courseNo" | "name" | "semester">) => {
  const name = compactCourseText(course.name);
  if (isFullYearCourseName(course.name)) {
    const term = getSemesterTerm(course.semester);
    return name && term ? `full-year:${name}:${term}` : "";
  }
  const courseNo = compactCourseText(course.courseNo);
  if (courseNo && name) return `no-name:${courseNo}:${name}`;
  if (courseNo) return `no:${courseNo}`;
  return name ? `name:${name}` : "";
};

const compactCourseText = (value: string) =>
  value.normalize("NFKC").replace(/⻄/g, "西").replace(/\s+/g, "").trim().toLowerCase();

const matchesAnyName = (courseName: string, names: string[]) => {
  const compactName = compactCourseText(courseName);
  return names.some((name) => compactName.includes(compactCourseText(name)));
};

const getCourseDisplayName = (course: Pick<TranscriptCourse, "courseNo" | "name">) =>
  course.name || course.courseNo || "未命名課程";

const getChoiceRequirementOption = (course: Pick<TranscriptCourse, "name">, requirement: ChoiceCreditRequirement) =>
  requirement.options.find((option) => option.pattern.test(course.name));

const isHomeDepartmentCourse = (course: Pick<TranscriptCourse, "offeredBy">, profile: RequirementProfile) =>
  profile.homeDepartmentPatterns.some((pattern) => pattern.test(compactCourseText(course.offeredBy)));

const isGeneralRequirementCategory = (category: string, profile: RequirementProfile) =>
  profile.generalRequirementCategories.includes(category);

const isDfllProfile = (profile: RequirementProfile) => profile.departmentName === dfllDepartmentName;

const isGeneralEducationCourse = (course: TranscriptCourse, profile: RequirementProfile) => {
  const category = getCourseCategory(course, profile);
  return isGeneralRequirementCategory(category, profile) || category === "統合領域" || category === "國防教育";
};

const isLiteratureCollegeGeneralCourse = (course: TranscriptCourse, profile: RequirementProfile) =>
  isGeneralEducationCourse(course, profile) && /(文學院|外文系|外國語文學系|中國文學|中文系|歷史學系|歷史系)/.test(course.offeredBy);

const isCommonEnglishCourse = (course: TranscriptCourse) =>
  /(英文|英語|English)/i.test(course.name) &&
  !/大一英文/.test(course.name) &&
  /(語言中心|LanguageCenter)/i.test(compactCourseText(course.offeredBy));

const isDfllDepartmentRequirementCourse = (course: Pick<TranscriptCourse, "name">) =>
  dfllRequiredProfessionalCourses.some((requirement) => matchesAnyName(course.name, requirement.aliases)) ||
  matchesAnyName(course.name, dfllBritishAmericanLiteratureCourses) ||
  matchesAnyName(course.name, dfllDigitalHumanitiesCourses) ||
  matchesAnyName(course.name, dfllCollegeEmiCourses);

const isDfllRequiredNamedProfessionalCourse = (course: Pick<TranscriptCourse, "name">) =>
  dfllRequiredProfessionalCourses.some((requirement) => matchesAnyName(course.name, requirement.aliases));

const isDfllBritishAmericanLiteratureCourse = (course: Pick<TranscriptCourse, "name">) =>
  matchesAnyName(course.name, dfllBritishAmericanLiteratureCourses);

const isDfllRequiredCourseForProgramRule = (
  course: TranscriptCourse,
  admissionYear: number,
  studentStatus: "local" | "foreign" = "local",
) => {
  const category = getCourseCategory(course, fallbackRequirementProfile);
  const isInformationLiteracyCourse =
    category === "資訊素養" || compactCourseText(course.name).includes(compactCourseText("資訊素養"));
  return (
    course.type === "必" ||
    fallbackRequirementProfile.languageLiteracyRequirements.some((requirement) => matchesAnyName(course.name, [requirement.name])) ||
    (category === "核心素養" && !(studentStatus === "foreign" && isInformationLiteracyCourse)) ||
    (category === "資訊素養" && studentStatus !== "foreign") ||
    category === "共同必修/通識" ||
    isDfllRequiredNamedProfessionalCourse(course) ||
    isDfllBritishAmericanLiteratureCourse(course) ||
    isDfllDigitalHumanitiesCourseForAdmissionYear(course, admissionYear) ||
    isDfllCollegeEmiCourseForAdmissionYear(course, admissionYear)
  );
};

const isDigitalHumanitiesProgramCourse = (course: TranscriptCourse) =>
  [...digitalHumanitiesProgramCourses, ...digitalHumanitiesProgramRecognizedCourses].some((rule) =>
    matchesAnyName(course.name, [rule.name]),
  );

const isCollegeOfLiberalArtsCourse = (course: Pick<TranscriptCourse, "offeredBy">) =>
  /(文學院|CollegeofLiberalArts)/i.test(compactCourseText(course.offeredBy));

const isCollegeDigitalInformationDesignAiCourse = (course: Pick<TranscriptCourse, "name">) =>
  /(數位|資訊|設計|AI)/i.test(course.name);

const isDfllDigitalHumanitiesCourseForAdmissionYear = (
  course: Pick<TranscriptCourse, "name" | "offeredBy">,
  admissionYear: number,
) =>
  matchesAnyName(course.name, dfllDigitalHumanitiesCourses) ||
  (admissionYear >= 112 && isCollegeOfLiberalArtsCourse(course) && isCollegeDigitalInformationDesignAiCourse(course));

const isDfllCollegeEmiCourseForAdmissionYear = (
  course: Pick<TranscriptCourse, "name" | "offeredBy" | "emi">,
  admissionYear: number,
) =>
  course.emi &&
  (matchesAnyName(course.name, dfllCollegeEmiCourses) ||
    (admissionYear >= 112 && isCollegeOfLiberalArtsCourse(course)));

const getPrimaryCreditAudit = (courses: TranscriptCourse[], profile: RequirementProfile, studentStatus: "local" | "foreign", admissionYear: number) => {
  const countableCourses = sortCoursesChronologically(
    courses.filter((course) => course.planId === defaultPlanId && countableCredits(course, profile) > 0),
  );
  const choiceRequirementAudits = profile.choiceCreditRequirements.map((requirement) => {
    const optionCredits = Object.fromEntries(requirement.options.map((option) => [option.id, 0])) as Record<string, number>;

    for (const course of countableCourses) {
      const option = getChoiceRequirementOption(course, requirement);
      if (option) optionCredits[option.id] += countableCredits(course, profile);
    }

    const selectedOption = requirement.options
      .map((option) => ({ ...option, credits: optionCredits[option.id] }))
      .sort((a, b) => b.credits - a.credits)[0];

    return {
      requirement,
      optionCredits,
      selectedOptionId: selectedOption?.credits > 0 ? selectedOption.id : "",
      protectedCredits: Math.min(selectedOption?.credits ?? 0, requirement.requiredCredits),
    };
  });

  const remainingProtectedCredits = Object.fromEntries(
    choiceRequirementAudits.map((audit) => [audit.requirement.title, audit.protectedCredits]),
  ) as Record<string, number>;
  let baseCredits = 0;
  let externalCredits = 0;
  let generalEducationCredits = 0;
  let excludedCredits = 0;
  let nationalDefenseCoursesAccepted = 0;
  let literatureCollegeGeneralCoursesAccepted = 0;
  const externalCourseCandidates: { course: TranscriptCourse; credits: number }[] = [];
  const generalEducationCandidates: { course: TranscriptCourse; credits: number }[] = [];
  const uncountedCourseAudits: { course: TranscriptCourse; acceptedCredits: number; uncountedCredits: number; note: string }[] = [];

  const addUncountedCourseAudit = (course: TranscriptCourse, acceptedCredits: number, uncountedCredits: number, note: string) => {
    if (uncountedCredits <= 0) return;
    uncountedCourseAudits.push({ course, acceptedCredits, uncountedCredits, note });
  };

  for (const course of countableCourses) {
    const credits = countableCredits(course, profile);
    const category = getCourseCategory(course, profile);
    const isGeneralEducation = isGeneralEducationCourse(course, profile);

    if (isDfllProfile(profile) && isCommonEnglishCourse(course)) {
      excludedCredits += credits;
      addUncountedCourseAudit(course, 0, credits, "外文系學生選修全校共同英文課程，不計入畢業學分。");
      continue;
    }

    if (isGeneralEducation) {
      if (course.genEdProfessorFromMajorDepartment) {
        excludedCredits += credits;
        addUncountedCourseAudit(course, 0, credits, "本系教師於通識中心所開課程，不列入畢業學分。");
        continue;
      }
      if (category === "國防教育") {
        if (nationalDefenseCoursesAccepted >= 1) {
          excludedCredits += credits;
          addUncountedCourseAudit(course, 0, credits, "國防教育類課程至多採計1門為通識畢業學分。");
          continue;
        }
        nationalDefenseCoursesAccepted += 1;
      }
      if (isDfllProfile(profile) && isLiteratureCollegeGeneralCourse(course, profile)) {
        if (literatureCollegeGeneralCoursesAccepted >= 1) {
          excludedCredits += credits;
          addUncountedCourseAudit(course, 0, credits, "文學學群通識課程至多採計1門，超修不採計為外系學分。");
          continue;
        }
        literatureCollegeGeneralCoursesAccepted += 1;
      }
      generalEducationCandidates.push({ course, credits });
      continue;
    }

    let protectedRequirementCredits = 0;
    let matchedChoiceRequirement = false;

    for (const audit of choiceRequirementAudits) {
      const option = getChoiceRequirementOption(course, audit.requirement);
      if (!option) continue;
      matchedChoiceRequirement = true;
      const remaining = remainingProtectedCredits[audit.requirement.title] ?? 0;
      const protectedForThisRequirement =
        option.id === audit.selectedOptionId && remaining > 0
          ? Math.min(credits - protectedRequirementCredits, remaining)
          : 0;

      if (protectedForThisRequirement > 0) {
        protectedRequirementCredits += protectedForThisRequirement;
        remainingProtectedCredits[audit.requirement.title] = remaining - protectedForThisRequirement;
      }
    }

    if (protectedRequirementCredits > 0) {
      baseCredits += protectedRequirementCredits;
    }

    const remainingCredits = credits - protectedRequirementCredits;
    if (remainingCredits <= 0) continue;

    const countsAsExternal =
      matchedChoiceRequirement ||
      (!isHomeDepartmentCourse(course, profile) &&
        !(isDfllProfile(profile) && isDfllDepartmentRequirementCourse(course)) &&
        !(isDfllProfile(profile) && isDfllDigitalHumanitiesCourseForAdmissionYear(course, admissionYear)) &&
        !(isDfllProfile(profile) && isDfllCollegeEmiCourseForAdmissionYear(course, admissionYear)) &&
        !isGeneralRequirementCategory(category, profile));

    if (countsAsExternal) {
      externalCredits += remainingCredits;
      externalCourseCandidates.push({ course, credits: remainingCredits });
    } else {
      baseCredits += remainingCredits;
    }
  }

  generalEducationCredits = generalEducationCandidates.reduce((sum, candidate) => sum + candidate.credits, 0);

  const buildExternalCourseAudits = (acceptedExternalCredits: number) => {
    let remainingAcceptedCredits = acceptedExternalCredits;
    return externalCourseCandidates.map(({ course, credits }) => {
      const acceptedCredits = Math.min(credits, remainingAcceptedCredits);
      remainingAcceptedCredits -= acceptedCredits;
      const uncountedCredits = Math.max(credits - acceptedCredits, 0);
      addUncountedCourseAudit(course, acceptedCredits, uncountedCredits, `外系學分超過${profile.externalCreditLimit ?? acceptedExternalCredits}學分上限，超出部分不計入畢業學分。`);
      return {
        course,
        credits,
        acceptedCredits,
        uncountedCredits,
      };
    });
  };

  if (isDfllProfile(profile)) {
    const languageLiteracyRequired = profile.languageLiteracyRequirements.reduce((sum, requirement) => sum + requirement.requiredCredits, 0);
    const infoRequired = studentStatus === "foreign" ? 0 : 1;
    const requiredGeneralEducationCredits = languageLiteracyRequired + 3 + infoRequired + 6 + 4;
    const acceptedGeneralEducationCredits = Math.min(
      generalEducationCredits,
      requiredGeneralEducationCredits + dfllGeneralEdOverflowExternalLimit,
    );
    const generalEducationOverflowCredits = Math.max(generalEducationCredits - requiredGeneralEducationCredits, 0);
    const acceptedGeneralEducationOverflowCredits = Math.min(generalEducationOverflowCredits, dfllGeneralEdOverflowExternalLimit);
    baseCredits += acceptedGeneralEducationCredits;
    excludedCredits += Math.max(generalEducationCredits - acceptedGeneralEducationCredits, 0);
    let remainingAcceptedGeneralEducationCredits = acceptedGeneralEducationCredits;
    for (const { course, credits } of generalEducationCandidates) {
      const acceptedCredits = Math.min(credits, remainingAcceptedGeneralEducationCredits);
      remainingAcceptedGeneralEducationCredits -= acceptedCredits;
      addUncountedCourseAudit(
        course,
        acceptedCredits,
        Math.max(credits - acceptedCredits, 0),
        `通識課程已超過需求，通識課程超修最多採計${dfllGeneralEdOverflowExternalLimit}學分。`,
      );
    }

    const acceptedExternalCredits = Math.min(externalCredits, profile.externalCreditLimit ?? externalCredits);
    const externalCourseAudits = buildExternalCourseAudits(acceptedExternalCredits);
    return {
      completed: baseCredits + acceptedExternalCredits,
      externalCredits,
      acceptedExternalCredits,
      externalOverLimit: Math.max(externalCredits - (profile.externalCreditLimit ?? externalCredits), 0),
      externalCourseAudits,
      generalEducationCredits,
      acceptedGeneralEducationOverflowCredits,
      generalEducationOverflowCredits,
      excludedCredits,
      choiceRequirementAudits,
      uncountedCourseAudits,
    };
  }

  baseCredits += generalEducationCredits;
  const acceptedExternalCredits = Math.min(externalCredits, profile.externalCreditLimit ?? externalCredits);
  const externalCourseAudits = buildExternalCourseAudits(acceptedExternalCredits);
  return {
    completed: baseCredits + acceptedExternalCredits,
    externalCredits,
    acceptedExternalCredits,
    externalOverLimit: Math.max(externalCredits - (profile.externalCreditLimit ?? externalCredits), 0),
    externalCourseAudits,
    generalEducationCredits,
    acceptedGeneralEducationOverflowCredits: 0,
    generalEducationOverflowCredits: 0,
    excludedCredits,
    choiceRequirementAudits,
    uncountedCourseAudits,
  };
};

const withCourseDefaults = (
  course: Partial<TranscriptCourse> & Pick<TranscriptCourse, "name" | "credits" | "grade">,
  profile: RequirementProfile = fallbackRequirementProfile,
): TranscriptCourse => ({
  courseNo: course.courseNo ?? "",
  semester: course.semester ?? "",
  ...course,
  score: course.score ?? "",
  type: course.type ?? "",
  typeLabel: course.typeLabel ?? (course.type ? typeLabels[course.type] ?? course.type : ""),
  category: course.category ?? (course.type === "體" || course.type === "服" ? profile.nonGraduationRequirement?.category ?? "體育/服務學習" : inferCategory(course.name, profile, course.offeredBy)),
  offeredBy: course.offeredBy ?? "",
  emi: course.emi ?? false,
  genEdProfessorFromMajorDepartment: course.genEdProfessorFromMajorDepartment ?? false,
  planId: course.planId ?? defaultPlanId,
});

const normalizePasteText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/⼀/g, "一")
    .replace(/⼆/g, "二")
    .replace(/⼤/g, "大")
    .replace(/⽤/g, "用")
    .replace(/⾔/g, "言")
    .replace(/⼼/g, "心")
    .replace(/⽬/g, "目")
    .replace(/⾨/g, "門")
    .replace(/⼯/g, "工")
    .replace(/⻄/g, "西")
    .replace(/[ \t　]+/g, " ")
    .trim();

const parseStructuredRows = (text: string, profile: RequirementProfile): TranscriptCourse[] => {
  const rows = text
    .split(/\r?\n/)
    .map((line) => normalizePasteText(line))
    .filter(Boolean);

  return rows
    .map((row) => {
      const columns = row
        .split(/\t|,|，/)
        .map((column) => column.trim())
        .filter(Boolean);

      if (columns.length >= 4) {
        const [semester, name, credits, grade] = columns;
        const parsedCredits = Number(credits);
        return withCourseDefaults({
          semester,
          name,
          credits: parsedCredits,
          grade: normalizeGrade(grade),
        }, profile);
      }

      if (columns.length === 3) {
        const [name, credits, grade] = columns;
        const parsedCredits = Number(credits);
        return withCourseDefaults({
          name,
          credits: parsedCredits,
          grade: normalizeGrade(grade),
        }, profile);
      }

      const looseMatch = row.match(/^(.+?)\s+([0-6](?:\.[05])?)\s+([A-F][+-]?|P|W|抵)$/i);
      if (!looseMatch) return undefined;

      return withCourseDefaults({
        name: looseMatch[1].trim(),
        credits: Number(looseMatch[2]),
        grade: normalizeGrade(looseMatch[3]),
      }, profile);
    })
    .filter((course): course is TranscriptCourse => Boolean(course?.name && course.credits > 0));
};

const parseNchuCopiedTranscript = (text: string, profile: RequirementProfile): TranscriptCourse[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizePasteText(line))
    .filter(Boolean);
  const courses: TranscriptCourse[] = [];
  let currentBlock: string[] = [];
  const categoryLabels = [
    "人文領域",
    "社會科學領域",
    "自然科學領域",
    "統合領域",
    "核心素養",
    "資訊素養",
    "全校可選修",
    "專業領域微課程",
    "體育",
  ];

  const isCourseStart = (line: string) => /^([A-Z]?\d{4,6}|抵)\s*(必|選|通|體|服|Req|Elec|Gen|P\.?E\.?|Service)?$/i.test(line);
  const scoreMatch = (line: string) =>
    line.match(/^([0-6](?:\.[05])?)\s+(\d{1,3}|I|W|-)\s*([A-F][+-]?|P|W|抵|-)\s*([YN-])(?:\s+.*)?$/i) ??
    line.match(/(?:^|\s)([0-6](?:\.[05])?)\s*(抵)$/i);
  const compactLine = (line: string) => line.replace(/\s+/g, "");
  const cleanOfferedBy = (line: string) =>
    line.match(/([\u4e00-\u9fff]*(?:體育室|學務處|中心|學程|系|所|院))$/)?.[1] ?? line;
  const isNoiseLine = (line: string) =>
    /^(選課|號碼|Course|No|課程別|Category|科目名稱|Course Name|課程分類|Classify|開課系所|Offered Dept\.?|學分|Credits|成績|Score|等|第|GPA|EMI|課|程)$/.test(line) ||
    /(人文領域|社會科學領域|自然科學領域|核心素養|通識自由選|全校可選修|統合領域|專業領域微課程|通識中心|語言中心|體育室|學務處|外文系|Department|College|Office|Center|Humanistic|General Education|Category)/i.test(line);

  const findWrappedCategory = (chineseLines: string[]) => {
    const domainLabels = ["統合領域", "人文領域", "社會科學領域", "自然科學領域", "核心素養", "資訊素養", "專業領域微課程", "體育"];

    for (let start = 0; start < chineseLines.length; start += 1) {
      let joined = "";
      for (let end = start; end < Math.min(start + 3, chineseLines.length); end += 1) {
        joined += compactLine(chineseLines[end]);
        const label = categoryLabels.find((category) => joined === category);
        if (label) return { label, start, end };

        const matchedDomain = domainLabels.find((category) => joined.endsWith(category));
        if (matchedDomain && /^通識自由選修?\//.test(joined)) {
          return { label: matchedDomain, start, end };
        }
      }
    }
    return undefined;
  };

  const flushBlock = () => {
    if (currentBlock.length === 0) return;
    const block = currentBlock;
    currentBlock = [];

    const scoreLine = block.find((line) => scoreMatch(line));
    const matchedScore = scoreLine ? scoreMatch(scoreLine) : undefined;
    if (!matchedScore) return;

    const startMatch = block[0].match(/^([A-Z]?\d{4,6}|抵)\s*(必|選|通|體|服)?/);
    const chineseLines = block
      .slice(1)
      .filter((line) => line !== scoreLine)
      .filter((line) => /[\u4e00-\u9fff]/.test(line));

    const categoryMatch = findWrappedCategory(chineseLines);
    const category =
      categoryMatch?.label === "體育"
        ? profile.nonGraduationRequirement?.category ?? "體育/服務學習"
        : categoryMatch?.label === "全校可選修"
          ? "其他"
          : categoryMatch?.label;
    const offeredByIndex = chineseLines.findIndex((line) => /(?:夜外文|系|所|學程|中心|院|體育室|學務處)$/.test(line) && line !== category);
    const offeredBy = offeredByIndex >= 0 ? cleanOfferedBy(chineseLines[offeredByIndex]) : "";
    const nameEnd =
      categoryMatch?.start ??
      (offeredByIndex >= 0 ? offeredByIndex : chineseLines.length);
    const name = chineseLines
      .slice(0, nameEnd)
      .filter((line) => !isNoiseLine(line))
      .map(compactLine)
      .join("");
    if (!name) return;

    courses.push(withCourseDefaults({
      courseNo: startMatch?.[1] === "抵" ? "" : startMatch?.[1] ?? "",
      type: startMatch?.[2] ?? "",
      semester: "",
      name,
      credits: Number(matchedScore[1]),
      score: matchedScore[3] ? matchedScore[2] : "",
      grade: normalizeGrade(matchedScore[3] ?? matchedScore[2]),
      category: category ?? inferCategory(name, profile, offeredBy),
      offeredBy: offeredBy ?? "",
      emi: matchedScore[4]?.toUpperCase() === "Y",
    }, profile));
  };

  for (const line of lines) {

    if (isCourseStart(line)) {
      flushBlock();
      currentBlock = [line];
      continue;
    }

    if (currentBlock.length > 0) {
      currentBlock.push(line);
      if (scoreMatch(line)) flushBlock();
    }
  }

  flushBlock();
  return courses;
};

const parsePastedCourses = (text: string, profile: RequirementProfile): TranscriptCourse[] => {
  const structuredCourses = parseStructuredRows(text, profile);
  const copiedTranscriptCourses = parseNchuCopiedTranscript(text, profile);
  return [...structuredCourses, ...copiedTranscriptCourses];
};

export function CreditCalculator() {
  const { courses, profile, plans, setPlans, setTranscript, clearTranscript } = useTranscript();
  const [selectedDepartment, setSelectedDepartment] = useState(profile.department);
  const [studentStatus, setStudentStatus] = useState<"local" | "foreign">(profile.studentStatus ?? "local");
  const [admissionYear, setAdmissionYear] = useState(Math.max(profile.admissionYear ?? firstSupportedAdmissionYear, firstSupportedAdmissionYear));
  const semesterOptions = useMemo(() => getSemesterOptions(admissionYear), [admissionYear]);
  const [pasteSemester, setPasteSemester] = useState(`${Math.max(profile.admissionYear ?? firstSupportedAdmissionYear, firstSupportedAdmissionYear)}-1`);
  const [pasteText, setPasteText] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");
  const [selectedCategorySummary, setSelectedCategorySummary] = useState("");
  const [showExternalCreditCourses, setShowExternalCreditCourses] = useState(false);
  const [selectedDfllRequirementDetail, setSelectedDfllRequirementDetail] = useState("");
  const [selectedPlanDetail, setSelectedPlanDetail] = useState("");
  const [selectedProgramPlanId, setSelectedProgramPlanId] = useState(optionalProgramPlans[0]?.id ?? "");
  const requirementProfile = useMemo(() => getRequirementProfile(selectedDepartment), [selectedDepartment]);

  const groupedCredits = useMemo(() => {
    const groups = Object.fromEntries(categoryOptions.map((category) => [category, 0])) as Record<string, number>;

    for (const course of courses) {
      const category = getCourseCategory(course, requirementProfile);
      groups[category] += countableCredits(course, requirementProfile);
    }
    return groups;
  }, [courses, requirementProfile]);

  const selectedCategoryCourses = useMemo(
    () =>
      selectedCategorySummary
        ? sortCoursesChronologically(courses.filter((course) => getCourseCategory(course, requirementProfile) === selectedCategorySummary))
        : [],
    [courses, requirementProfile, selectedCategorySummary],
  );
  const chronologicalCourseRows = useMemo(
    () =>
      courses
        .map((course, index) => ({ course, index }))
        .sort((a, b) => getCourseChronology(a.course) - getCourseChronology(b.course) || a.index - b.index),
    [courses],
  );

  const primaryPlan = plans.find((plan) => plan.id === defaultPlanId) ?? plans[0];
  const primaryCreditAudit = useMemo(() => getPrimaryCreditAudit(courses, requirementProfile, studentStatus, admissionYear), [admissionYear, courses, requirementProfile, studentStatus]);
  const primaryCompleted = primaryCreditAudit.completed;
  const primaryRemaining = Math.max((primaryPlan?.requiredCredits ?? 128) - primaryCompleted, 0);
  const primaryProgress = Math.min((primaryCompleted / (primaryPlan?.requiredCredits ?? 128)) * 100, 100);
  const uncountedCourseAuditMap = useMemo(
    () => new Map(primaryCreditAudit.uncountedCourseAudits.map((audit) => [audit.course, audit])),
    [primaryCreditAudit],
  );
  const getCourseCreditStatus = (course: TranscriptCourse) => {
    const category = getCourseCategory(course, requirementProfile);
    if (isWithdrawnCourse(course)) {
      return { isUncounted: true, note: "退選，學分不計入畢業學分。", acceptedCredits: 0, uncountedCredits: course.credits };
    }
    if (isFailedCourse(course)) {
      return { isUncounted: true, note: "不及格，學分不計入畢業學分。", acceptedCredits: 0, uncountedCredits: course.credits };
    }
    if (requirementProfile.nonGraduationCreditCategories.includes(category)) {
      return { isUncounted: true, note: "體育課程不計入畢業學分。", acceptedCredits: 0, uncountedCredits: course.credits };
    }
    const audit = uncountedCourseAuditMap.get(course);
    if (audit) return { isUncounted: true, note: audit.note, acceptedCredits: audit.acceptedCredits, uncountedCredits: audit.uncountedCredits };
    return { isUncounted: false, note: "", acceptedCredits: countableCredits(course, requirementProfile), uncountedCredits: 0 };
  };

  const planProgress = useMemo(
    () =>
      plans.map((plan) => {
        const assignedPlanCourses = sortCoursesChronologically(courses.filter((course) => course.planId === plan.id));
        const planCourses =
          plan.id === digitalHumanitiesProgramId
            ? sortCoursesChronologically(courses)
            : assignedPlanCourses;
        const programRecognizedCourses =
          plan.id === digitalHumanitiesProgramId
            ? planCourses.filter((course) => isDigitalHumanitiesProgramCourse(course) && normalizeGrade(course.grade) !== "抵")
            : planCourses;
        const countedPlanCourses = programRecognizedCourses.filter((course) => countableCredits(course, requirementProfile) > 0);
        const completed =
          plan.id === defaultPlanId
            ? primaryCreditAudit.completed
            : countedPlanCourses.reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
        const nonRequiredCredits =
          plan.id === digitalHumanitiesProgramId
            ? countedPlanCourses
              .filter((course) => !isDfllRequiredCourseForProgramRule(course, admissionYear, studentStatus))
              .reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0)
            : 0;
        const unrecognizedCourses =
          plan.id === digitalHumanitiesProgramId
            ? assignedPlanCourses.filter((course) => !isDigitalHumanitiesProgramCourse(course) || normalizeGrade(course.grade) === "抵")
            : [];
        const requirementRemaining =
          plan.id === digitalHumanitiesProgramId
            ? Math.max(Math.max(plan.requiredCredits - completed, 0), Math.max(6 - nonRequiredCredits, 0))
            : Math.max(plan.requiredCredits - completed, 0);
        return {
          ...plan,
          completed,
          remaining: requirementRemaining,
          progress: Math.min((completed / plan.requiredCredits) * 100, 100),
          nonRequiredCredits,
          countedCourses: countedPlanCourses,
          unrecognizedCourses,
        };
      }),
    [admissionYear, courses, plans, primaryCreditAudit, requirementProfile, studentStatus],
  );

  const nonGraduationRequirement = useMemo(() => {
    const configuredRequirement = requirementProfile.nonGraduationRequirement;
    if (!configuredRequirement) return undefined;
    const completed = courses.filter((course) => getCourseCategory(course, requirementProfile) === configuredRequirement.category).length;
    return {
      ...configuredRequirement,
      completed,
      done: completed >= configuredRequirement.requiredCourses,
    };
  }, [courses, requirementProfile]);

  const languageLiteracyRequirements = useMemo(
    () =>
      requirementProfile.languageLiteracyRequirements.map((requirement) => {
        const completed = courses
          .filter((course) => compactCourseText(course.name).includes(compactCourseText(requirement.name)))
          .reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
        return {
          ...requirement,
          completed,
          remaining: Math.max(requirement.requiredCredits - completed, 0),
          progress: Math.min((completed / requirement.requiredCredits) * 100, 100),
        };
      }),
    [courses, requirementProfile],
  );

  const choiceRequirementViews = useMemo(
    () =>
      primaryCreditAudit.choiceRequirementAudits.map((audit) => {
        const options = audit.requirement.options.map((option) => {
          const completed = audit.optionCredits[option.id] ?? 0;
          return {
            ...option,
            completed,
            remaining: Math.max(audit.requirement.requiredCredits - completed, 0),
            progress: Math.min((completed / audit.requirement.requiredCredits) * 100, 100),
          };
        });
        return {
          requirement: audit.requirement,
          options,
          completedOption: options.find((option) => option.completed >= audit.requirement.requiredCredits),
        };
      }),
    [primaryCreditAudit],
  );

  const dfllRequirementAudits = useMemo(() => {
    if (!isDfllProfile(requirementProfile)) return undefined;
    const mainCourses = sortCoursesChronologically(courses.filter((course) => course.planId === defaultPlanId));
    const eligibleCourses = sortCoursesChronologically(
      mainCourses.filter(
        (course) =>
          countableCredits(course, requirementProfile) > 0 &&
          !isCommonEnglishCourse(course) &&
          !course.genEdProfessorFromMajorDepartment,
      ),
    );
    const sumByCategory = (category: string) =>
      eligibleCourses
        .filter((course) => getCourseCategory(course, requirementProfile) === category)
        .reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
    const countByCategory = (category: string) =>
      eligibleCourses.filter((course) => getCourseCategory(course, requirementProfile) === category).length;
    const sumByNames = (names: string[]) =>
      eligibleCourses
        .filter((course) => matchesAnyName(course.name, names))
        .reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
    const detailByCategory = (category: string) =>
      eligibleCourses.filter((course) => getCourseCategory(course, requirementProfile) === category);
    const detailByNames = (names: string[]) =>
      eligibleCourses.filter((course) => matchesAnyName(course.name, names));
    const overflowByNames = (names: string[], protectedCredits: number) => {
      let remainingProtectedCredits = protectedCredits;
      return eligibleCourses.filter((course) => {
        if (!matchesAnyName(course.name, names)) return false;
        const credits = countableCredits(course, requirementProfile);
        const protectedForCourse = Math.min(credits, remainingProtectedCredits);
        remainingProtectedCredits -= protectedForCourse;
        return credits - protectedForCourse > 0;
      });
    };
    const isChoiceRequirementCourse = (course: TranscriptCourse) =>
      requirementProfile.choiceCreditRequirements.some((requirement) => getChoiceRequirementOption(course, requirement));
    const requiredProfessionalCourses = eligibleCourses.filter(
      (course) =>
        isDfllRequiredNamedProfessionalCourse(course) ||
        isDfllBritishAmericanLiteratureCourse(course) ||
        isChoiceRequirementCourse(course),
    );
    const professionalElectiveBaseCourses = eligibleCourses.filter(
      (course) =>
        isHomeDepartmentCourse(course, requirementProfile) &&
        !isDfllRequiredNamedProfessionalCourse(course) &&
        !isDfllBritishAmericanLiteratureCourse(course) &&
        !isChoiceRequirementCourse(course),
    );

    const humanSocialNaturalCredits =
      sumByCategory("人文領域") + sumByCategory("社會科學領域") + sumByCategory("自然科學領域");
    const infoLiteracyCourses = eligibleCourses.filter(
      (course) => getCourseCategory(course, requirementProfile) === "資訊素養" || compactCourseText(course.name).includes(compactCourseText("資訊素養")),
    );
    const infoLiteracyCredits = infoLiteracyCourses.reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
    const britishAmericanLiteratureCredits = sumByNames(dfllBritishAmericanLiteratureCourses);
    const britishAmericanLiteratureOverflowCredits = Math.max(britishAmericanLiteratureCredits - 12, 0);
    const digitalHumanitiesCourses = eligibleCourses.filter((course) =>
      isDfllDigitalHumanitiesCourseForAdmissionYear(course, admissionYear),
    );
    const digitalHumanitiesCredits = digitalHumanitiesCourses.reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
    const collegeEmiCourses = eligibleCourses.filter((course) =>
      isDfllCollegeEmiCourseForAdmissionYear(course, admissionYear),
    );
    const collegeEmiCredits = collegeEmiCourses.reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
    const requiredNamedCredits = dfllRequiredProfessionalCourses.reduce((sum, requirement) => {
      return sum + getFullYearCompletedCredits(eligibleCourses, requirement.aliases, requirement.requiredCredits, requirementProfile);
    }, 0);
    const secondLanguageCredits = Math.max(
      ...choiceRequirementViews.flatMap((view) => view.options.map((option) => Math.min(option.completed, view.requirement.requiredCredits))),
      0,
    );
    const requiredProfessionalCredits = requiredNamedCredits + Math.min(britishAmericanLiteratureCredits, 12) + secondLanguageCredits;
    const professionalElectiveBaseCredits = professionalElectiveBaseCourses.reduce((sum, course) => sum + countableCredits(course, requirementProfile), 0);
    const professionalElectiveCredits = professionalElectiveBaseCredits + britishAmericanLiteratureOverflowCredits;
    const britishAmericanLiteratureOverflowCourses = overflowByNames(dfllBritishAmericanLiteratureCourses, 12);
    const professionalElectiveCourses =
      britishAmericanLiteratureOverflowCredits > 0
        ? [...professionalElectiveBaseCourses, ...britishAmericanLiteratureOverflowCourses]
        : professionalElectiveBaseCourses;
    const noExternalCourses = primaryCreditAudit.externalCredits === 0;

    return {
      core: { completed: sumByCategory("核心素養"), required: 3, courses: detailByCategory("核心素養") },
      info: { completed: infoLiteracyCredits, required: studentStatus === "foreign" ? 0 : 1, courses: infoLiteracyCourses },
      humanities: { completedCourses: countByCategory("人文領域"), completedCredits: sumByCategory("人文領域"), courses: detailByCategory("人文領域") },
      social: { completedCourses: countByCategory("社會科學領域"), completedCredits: sumByCategory("社會科學領域"), courses: detailByCategory("社會科學領域") },
      natural: { completedCourses: countByCategory("自然科學領域"), completedCredits: sumByCategory("自然科學領域"), courses: detailByCategory("自然科學領域") },
      humanSocialNaturalCredits,
      humanSocialNaturalCourses: [...detailByCategory("人文領域"), ...detailByCategory("社會科學領域"), ...detailByCategory("自然科學領域")],
      comprehensive: { completed: sumByCategory("統合領域"), required: 4, courses: detailByCategory("統合領域") },
      digitalHumanities: { completed: digitalHumanitiesCredits, required: 2, courses: digitalHumanitiesCourses },
      collegeEmi: {
        completed: collegeEmiCredits,
        required: 2,
        courses: collegeEmiCourses,
      },
      collegeRequired: {
        completed: Math.min(digitalHumanitiesCredits, 2) + Math.min(collegeEmiCredits, 2),
        required: 4,
        courses: Array.from(new Set([...digitalHumanitiesCourses, ...collegeEmiCourses])),
      },
      requiredProfessional: { completed: requiredProfessionalCredits, required: 46, courses: requiredProfessionalCourses },
      professionalElective: { completed: professionalElectiveCredits, required: 32, courses: professionalElectiveCourses },
      professionalElectiveIfNoExternal: {
        enabled: noExternalCourses,
        completed: professionalElectiveCredits,
        required: 52,
      },
      britishAmericanLiterature: {
        completed: britishAmericanLiteratureCredits,
        required: 12,
        courses: detailByNames(dfllBritishAmericanLiteratureCourses),
        overflowCourses: britishAmericanLiteratureOverflowCourses,
      },
    };
  }, [admissionYear, choiceRequirementViews, courses, primaryCreditAudit.externalCredits, requirementProfile, studentStatus]);

  const dfllRequirementRows = useMemo(() => {
    if (!dfllRequirementAudits) return [];
    const rows = [
      {
        id: "core",
        label: "核心素養",
        summary: `${dfllRequirementAudits.core.completed} / ${dfllRequirementAudits.core.required} 學分`,
        courses: dfllRequirementAudits.core.courses,
      },
      {
        id: "info",
        label: "資訊素養",
        summary: dfllRequirementAudits.info.required === 0 ? "外籍生免修" : `${dfllRequirementAudits.info.completed} / ${dfllRequirementAudits.info.required} 學分`,
        courses: dfllRequirementAudits.info.courses,
      },
      {
        id: "hsn",
        label: "人文/社會/自然",
        summary: `${dfllRequirementAudits.humanSocialNaturalCredits} / 6 學分`,
        courses: dfllRequirementAudits.humanSocialNaturalCourses,
      },
      {
        id: "comprehensive",
        label: "統合領域",
        summary: `${dfllRequirementAudits.comprehensive.completed} / ${dfllRequirementAudits.comprehensive.required} 學分`,
        courses: dfllRequirementAudits.comprehensive.courses,
      },
      {
        id: "college-required",
        label: "院專業必修課程",
        summary: `數位人文 ${dfllRequirementAudits.digitalHumanities.completed} / ${dfllRequirementAudits.digitalHumanities.required}，EMI ${dfllRequirementAudits.collegeEmi.completed} / ${dfllRequirementAudits.collegeEmi.required} 學分`,
        courses: dfllRequirementAudits.collegeRequired.courses,
      },
      {
        id: "required-professional",
        label: "系專業必修",
        summary: `${dfllRequirementAudits.requiredProfessional.completed} / ${dfllRequirementAudits.requiredProfessional.required} 學分`,
        courses: dfllRequirementAudits.requiredProfessional.courses,
      },
      {
        id: "british-american-literature",
        label: "英美文學",
        summary: `${dfllRequirementAudits.britishAmericanLiterature.completed} / ${dfllRequirementAudits.britishAmericanLiterature.required} 學分`,
        courses: dfllRequirementAudits.britishAmericanLiterature.courses,
      },
      {
        id: "professional-elective",
        label: "系專業選修",
        summary: `${dfllRequirementAudits.professionalElective.completed} / ${dfllRequirementAudits.professionalElective.required} 學分`,
        courses: dfllRequirementAudits.professionalElective.courses,
      },
    ];

    if (dfllRequirementAudits.professionalElectiveIfNoExternal.enabled) {
      rows.push({
        id: "professional-elective-no-external",
        label: "未選外系時本系專業選修",
        summary: `${dfllRequirementAudits.professionalElectiveIfNoExternal.completed} / ${dfllRequirementAudits.professionalElectiveIfNoExternal.required} 學分`,
        courses: dfllRequirementAudits.professionalElective.courses,
      });
    }
    return rows;
  }, [dfllRequirementAudits]);

  const selectedDfllRequirementRow = dfllRequirementRows.find((row) => row.id === selectedDfllRequirementDetail);
  const primaryRequirementsFulfilled = (() => {
    const languageDone = languageLiteracyRequirements.every((requirement) => requirement.completed >= requirement.requiredCredits);
    const nonGraduationDone = !nonGraduationRequirement || nonGraduationRequirement.done;
    const choiceRequirementsDone = choiceRequirementViews.every((view) => Boolean(view.completedOption));
    if (!dfllRequirementAudits) return languageDone && nonGraduationDone && choiceRequirementsDone;

    const dfllDone =
      dfllRequirementAudits.core.completed >= dfllRequirementAudits.core.required &&
      dfllRequirementAudits.info.completed >= dfllRequirementAudits.info.required &&
      dfllRequirementAudits.humanities.completedCourses >= 1 &&
      dfllRequirementAudits.social.completedCourses >= 1 &&
      dfllRequirementAudits.natural.completedCourses >= 1 &&
      dfllRequirementAudits.humanSocialNaturalCredits >= 6 &&
      dfllRequirementAudits.comprehensive.completed >= dfllRequirementAudits.comprehensive.required &&
      dfllRequirementAudits.digitalHumanities.completed >= dfllRequirementAudits.digitalHumanities.required &&
      dfllRequirementAudits.collegeEmi.completed >= dfllRequirementAudits.collegeEmi.required &&
      dfllRequirementAudits.requiredProfessional.completed >= dfllRequirementAudits.requiredProfessional.required &&
      dfllRequirementAudits.britishAmericanLiterature.completed >= dfllRequirementAudits.britishAmericanLiterature.required &&
      dfllRequirementAudits.professionalElective.completed >= dfllRequirementAudits.professionalElective.required &&
      (!dfllRequirementAudits.professionalElectiveIfNoExternal.enabled ||
        dfllRequirementAudits.professionalElectiveIfNoExternal.completed >= dfllRequirementAudits.professionalElectiveIfNoExternal.required);

    return languageDone && nonGraduationDone && choiceRequirementsDone && dfllDone;
  })();
  const primaryStatusIncomplete = primaryRemaining > 0 || !primaryRequirementsFulfilled;

  const updateTranscript = (nextCourses: TranscriptCourse[]) => {
    setTranscript({
      courses: nextCourses,
      rawText: "",
      profile: { name: "", department: selectedDepartment, studentStatus, admissionYear },
      plans,
    });
  };

  const updateCourse = (index: number, field: keyof TranscriptCourse, value: string) => {
    const nextCourses = courses.map((course, courseIndex) => {
      if (courseIndex !== index) return course;
      return {
        ...course,
        [field]:
          field === "credits"
            ? Number(value)
            : field === "grade"
              ? normalizeGrade(value)
            : field === "emi"
              ? value === "true"
              : field === "genEdProfessorFromMajorDepartment"
                ? value === "true"
                : field === "type"
                  ? value
                  : value,
        ...(field === "type" ? { typeLabel: typeLabels[value] ?? value } : {}),
      };
    });
    const changedCourse = nextCourses[index];
    const duplicateKey = changedCourse ? getDuplicateKey(changedCourse) : "";
    const hasDuplicate =
      duplicateKey &&
      nextCourses.some((course, courseIndex) => courseIndex !== index && getDuplicateKey(course) === duplicateKey);
    if (hasDuplicate && changedCourse) {
      setPasteMessage(`「${getCourseDisplayName(changedCourse)}」已經加入過，重複修習課程不會採計學分，因此不接受重複輸入。`);
      return;
    }
    updateTranscript(nextCourses);
  };

  const addCourse = () => {
    updateTranscript([...courses, { ...emptyCourse(), semester: pasteSemester }]);
  };

  const removeCourse = (index: number) => {
    updateTranscript(courses.filter((_, courseIndex) => courseIndex !== index));
  };

  const exportCoursesAsPlainText = () => {
    const cleanCell = (value: string | number | boolean) => String(value).replace(/\s+/g, " ").trim();
    const headers = [
      "選課號碼",
      "學期",
      "課程別",
      "課程名稱",
      "學分",
      "分數",
      "成績",
      "分類",
      "開課系所",
      "EMI",
      "通識本系教師",
      "採計",
      "備註",
    ];
    const rows = chronologicalCourseRows.map(({ course }) => {
      const creditStatus = getCourseCreditStatus(course);
      const plan = plans.find((item) => item.id === (course.planId || defaultPlanId));
      return [
        course.courseNo,
        course.semester || "未選",
        course.typeLabel || typeLabels[course.type] || course.type || "未分類",
        course.name,
        course.credits,
        getScoreDisplay(course),
        course.grade,
        getCourseCategory(course, requirementProfile),
        course.offeredBy,
        course.emi ? "Y" : "N",
        course.genEdProfessorFromMajorDepartment ? "是" : "否",
        plan?.name ?? "",
        creditStatus.note,
      ].map(cleanCell).join("\t");
    });
    const text = [headers.join("\t"), ...rows].join("\r\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nchu-courses-${admissionYear}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAdmissionYearChange = (year: number) => {
    const safeYear = Math.max(year, firstSupportedAdmissionYear);
    const nextSemesterOptions = getSemesterOptions(safeYear);
    setAdmissionYear(safeYear);
    setPasteSemester(nextSemesterOptions[0]);
    const nextCourses = courses.map((course) =>
      nextSemesterOptions.includes(course.semester) ? course : { ...course, semester: "" },
    );
    const nextPlans = plans.map((plan) => (plan.id === defaultPlanId ? { ...plan, admissionYear: safeYear } : plan));
    setTranscript({
      courses: nextCourses,
      rawText: "",
      profile: { name: "", department: selectedDepartment, studentStatus, admissionYear: safeYear },
      plans: nextPlans,
    });
  };

  const addPlan = (type: Exclude<RequirementPlanType, "program">) => {
    const id = `${type}-${Date.now()}`;
    setPlans([
      ...plans,
      {
        id,
        type,
        name: planTypeLabels[type],
        requiredCredits: type === "minor" ? 20 : 30,
        source: "custom",
      },
    ]);
  };

  const addProgramPlan = (programId: string) => {
    const program = optionalProgramPlans.find((plan) => plan.id === programId);
    if (!program || plans.some((plan) => plan.id === program.id)) return;
    setPlans([...plans, program]);
  };

  const updatePlan = (id: string, field: keyof RequirementPlan, value: string) => {
    setPlans(
      plans.map((plan) =>
        plan.id === id
          ? {
            ...plan,
            [field]: field === "requiredCredits" ? Number(value) : value,
          }
          : plan,
      ),
    );
  };

  const removePlan = (id: string) => {
    if (id === defaultPlanId) return;
    const nextPlans = plans.filter((plan) => plan.id !== id);
    const nextCourses = courses.map((course) => (course.planId === id ? { ...course, planId: defaultPlanId } : course));
    setTranscript({
      courses: nextCourses,
      rawText: "",
      profile: { name: "", department: selectedDepartment, studentStatus, admissionYear },
      plans: nextPlans,
    });
  };

  const importPaste = () => {
    const imported = parsePastedCourses(pasteText, requirementProfile);
    if (imported.length === 0) {
      setPasteMessage("沒有讀到可匯入的課程。請複製 學生歷年成績查詢 的內容。");
      return;
    }
    const importedWithSemester = imported.map((course) => ({ ...course, semester: course.semester || pasteSemester }));
    const existingKeys = new Set(courses.map(getDuplicateKey).filter(Boolean));
    const accepted: TranscriptCourse[] = [];
    const duplicateNames: string[] = [];
    const seenImportKeys = new Set<string>();

    for (const course of importedWithSemester) {
      const key = getDuplicateKey(course);
      if (key && (existingKeys.has(key) || seenImportKeys.has(key))) {
        duplicateNames.push(getCourseDisplayName(course));
        continue;
      }
      if (key) seenImportKeys.add(key);
      accepted.push(course);
    }

    if (accepted.length === 0) {
      setPasteMessage(`沒有匯入新課程，因為貼上的課程都已經加入過：${duplicateNames.join("、")}`);
      return;
    }

    updateTranscript([...courses, ...accepted]);
    setPasteText("");
    setPasteMessage(
      `已匯入 ${accepted.length} 門課。${
        duplicateNames.length > 0 ? ` 已略過 ${duplicateNames.length} 門重複課程：${duplicateNames.join("、")}。` : ""
      }`,
    );
  };

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
    const match = allDepartments.find((dept) => dept.name === department);
    const nextPlans = plans.map((plan) =>
      plan.id === defaultPlanId
        ? {
          ...plan,
          name: department || "主修",
          requiredCredits: match?.credits ?? 128,
          source: match ? "catalog" : "custom",
        }
        : plan,
    );
    setPlans(nextPlans);
    setTranscript({
      courses,
      rawText: "",
      profile: { name: "", department, studentStatus, admissionYear },
      plans: nextPlans,
    });
  };

  return (
    <div className="px-2 py-3 pb-6 md:px-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
          <Calculator className="text-white" size={18} />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">剩餘學分計算</h1>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">主修系所</label>
            <select
              value={selectedDepartment}
              onChange={(event) => handleDepartmentChange(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm transition-colors"
            >
              <option value="">外國語文學系 / 128 學分</option>
              {Object.entries(departmentCredits).map(([college, departments]) => (
                <optgroup key={college} label={college}>
                  {departments.map((department) => (
                    <option key={department.name} value={department.name}>
                      {department.name} / {department.credits} 學分
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">入學學年度</label>
                <select
                  value={admissionYear}
                  onChange={(event) => handleAdmissionYearChange(Number(event.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm transition-colors"
                >
                  {supportedAdmissionYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">學生身分</label>
              <select
                value={studentStatus}
                onChange={(event) => {
                  const nextStatus = event.target.value as "local" | "foreign";
                  setStudentStatus(nextStatus);
                  setTranscript({
                    courses,
                    rawText: "",
                    profile: { name: "", department: selectedDepartment, studentStatus: nextStatus, admissionYear },
                    plans,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm transition-colors"
              >
                <option value="local">本國生</option>
                <option value="foreign">外籍生（資訊素養免修）</option>
              </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">畢業條件方案</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">主修來自系所總學分；輔修、雙主修可手動設定，學程可依需要加入。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addPlan("minor")} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200">
                  加輔修
                </button>
                <button onClick={() => addPlan("double-major")} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200">
                  加雙主修
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedProgramPlanId}
                    onChange={(event) => setSelectedProgramPlanId(event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    aria-label="選擇學程"
                  >
                    {optionalProgramPlans.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => addProgramPlan(selectedProgramPlanId)}
                    disabled={!selectedProgramPlanId || plans.some((plan) => plan.id === selectedProgramPlanId)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 active:bg-gray-50 disabled:opacity-40 dark:active:bg-gray-700"
                  >
                    加學程
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="grid grid-cols-[90px_minmax(0,1fr)_90px_36px] gap-2 items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{planTypeLabels[plan.type]}</span>
                  <input
                    value={plan.name}
                    disabled={plan.id === defaultPlanId}
                    onChange={(event) => updatePlan(plan.id, "name", event.target.value)}
                    className="min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800"
                  />
                  <input
                    type="number"
                    min="0"
                    value={plan.requiredCredits || ""}
                    onChange={(event) => updatePlan(plan.id, "requiredCredits", event.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => removePlan(plan.id)}
                    disabled={plan.id === defaultPlanId}
                    aria-label="移除方案"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:active:bg-gray-700"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardPaste size={18} className="text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">貼上課程資料</p>
            </div>
            <textarea
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder="請複製 學生歷年成績查詢 的內容"
              className="min-h-28 w-full resize-y px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm transition-colors"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                貼上課程學期
                <select
                  value={pasteSemester}
                  onChange={(event) => setPasteSemester(event.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  {semesterOptions.map((semester) => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={importPaste}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white active:bg-blue-700 dark:bg-blue-500 dark:active:bg-blue-600"
              >
                <ClipboardPaste size={16} />
                匯入貼上的課程
              </button>
              {pasteMessage && <p className="text-sm text-gray-600 dark:text-gray-400">{pasteMessage}</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">課程清單</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={exportCoursesAsPlainText}
                  disabled={courses.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 active:bg-gray-50 disabled:opacity-40 dark:active:bg-gray-700"
                >
                  <Download size={16} />
                  匯出文字
                </button>
                <button
                  onClick={addCourse}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700"
                >
                  <Plus size={16} />
                  新增
                </button>
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">尚未輸入課程。可以貼上資料，或手動新增課程。</p>
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[1380px] text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-2">選課號碼</th>
                      <th className="py-2 pr-2">學期</th>
                      <th className="py-2 pr-2">課程別</th>
                      <th className="py-2 pr-2">課程名稱</th>
                      <th className="py-2 pr-2">學分</th>
                      <th className="py-2 pr-2">分數</th>
                      <th className="py-2 pr-2">成績</th>
                      <th className="py-2 pr-2">分類</th>
                      <th className="py-2 pr-2">開課系所</th>
                      <th className="py-2 pr-2">EMI</th>
                      <th className="py-2 pr-2">通識本系教師</th>
                      <th className="py-2 pr-2">採計</th>
                      <th className="py-2 pr-2">備註</th>
                      <th className="py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chronologicalCourseRows.map(({ course, index }) => {
                      const creditStatus = getCourseCreditStatus(course);
                      return (
                      <tr
                        key={index}
                        className={`border-t ${
                          creditStatus.isUncounted
                            ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                            : "border-gray-100 dark:border-gray-700"
                        }`}
                      >
                        <td className="py-2 pr-2">
                          <input
                            value={course.courseNo}
                            onChange={(event) => updateCourse(index, "courseNo", event.target.value)}
                            placeholder="0313"
                            className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={course.semester}
                            onChange={(event) => updateCourse(index, "semester", event.target.value)}
                            className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          >
                            <option value="">未選</option>
                            {semesterOptions.map((semester) => (
                              <option key={semester} value={semester}>{semester}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={course.type}
                            onChange={(event) => updateCourse(index, "type", event.target.value)}
                            className="w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          >
                            <option value="">未分類</option>
                            {Object.entries(typeLabels).map(([type, label]) => (
                              <option key={type} value={type}>
                                {type} / {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={course.name}
                            onChange={(event) => updateCourse(index, "name", event.target.value)}
                            placeholder="課程名稱"
                            className="w-full min-w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            max="6"
                            step="0.5"
                            value={course.credits || ""}
                            onChange={(event) => updateCourse(index, "credits", event.target.value)}
                            className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={getScoreDisplay(course)}
                            onChange={(event) => updateCourse(index, "score", event.target.value)}
                            placeholder="90"
                            readOnly={isUncountedOutcomeCourse(course)}
                            className={`w-44 rounded-md border px-2 py-1.5 ${
                              isUncountedOutcomeCourse(course)
                                ? "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                                : "border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            }`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={course.grade}
                            onChange={(event) => updateCourse(index, "grade", event.target.value)}
                            placeholder="A"
                            className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={course.category || inferCategory(course.name, requirementProfile, course.offeredBy)}
                            onChange={(event) => updateCourse(index, "category", event.target.value)}
                            className="w-36 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          >
                            {categoryOptions.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={course.offeredBy}
                            onChange={(event) => updateCourse(index, "offeredBy", event.target.value)}
                            placeholder="通識中心"
                            className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={course.emi}
                            onChange={(event) => updateCourse(index, "emi", event.target.checked ? "true" : "")}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={course.genEdProfessorFromMajorDepartment}
                            disabled={!isGeneralEducationCourse(course, requirementProfile)}
                            onChange={(event) => updateCourse(index, "genEdProfessorFromMajorDepartment", event.target.checked ? "true" : "")}
                            title="通識課程若由主修系所教師開課，請勾選；未勾選時預設不是本系教師。"
                            className="h-4 w-4 disabled:opacity-30"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={course.planId || defaultPlanId}
                            onChange={(event) => updateCourse(index, "planId", event.target.value)}
                            className="w-36 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-900 dark:text-white"
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <span className={`block max-w-64 text-xs ${creditStatus.isUncounted ? "text-red-700 dark:text-red-300" : "text-gray-500 dark:text-gray-400"}`}>
                            {creditStatus.note}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => removeCourse(index)}
                            aria-label="刪除課程"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100 dark:text-gray-400 dark:active:bg-gray-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div
            className={`rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg ${
              primaryStatusIncomplete
                ? "from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700"
                : "from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
            }`}
          >
            <div className="flex items-center justify-center mb-4">
              <GraduationCap size={32} className="opacity-90" />
            </div>
            <div className="text-center mb-4">
              <p className="text-xs opacity-75 mb-1">{selectedDepartment || "未選擇系所"}</p>
              <p className="text-sm opacity-90 mb-1">主修剩餘學分</p>
              <p className="text-5xl font-bold">{primaryRemaining}</p>
            </div>
            <div className={`w-full rounded-full h-2 mb-2 ${primaryStatusIncomplete ? "bg-orange-400/30" : "bg-blue-400/30"}`}>
              <div className="bg-white rounded-full h-2 transition-all duration-300" style={{ width: `${primaryProgress}%` }} />
            </div>
            <div className="flex justify-between text-xs opacity-90">
              <span>已完成 {primaryCompleted} 學分</span>
              <span>{primaryProgress.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-3">
            {planProgress.map((plan) => (
              <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <button
                  type="button"
                  onClick={() => setSelectedPlanDetail((current) => (current === plan.id ? "" : plan.id))}
                  className={`mb-2 flex w-full items-start justify-between gap-3 rounded-md text-left transition-colors ${
                    selectedPlanDetail === plan.id ? "bg-blue-50 p-2 dark:bg-blue-950/40" : ""
                  }`}
                >
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{planTypeLabels[plan.type]}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</p>
                    {(plan.admissionYear || plan.id === defaultPlanId) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.id === defaultPlanId ? admissionYear : plan.admissionYear} 學年度適用</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{plan.remaining} 缺</p>
                </button>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 mb-2">
                  <div className="h-2 rounded-full bg-blue-600 dark:bg-blue-400" style={{ width: `${plan.progress}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {plan.completed} / {plan.requiredCredits} 學分
                </p>
                {plan.id === digitalHumanitiesProgramId && (
                  <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <p>非原主修/雙主修必修：{plan.nonRequiredCredits} / 6 學分</p>
                    {plan.unrecognizedCourses.length > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {plan.unrecognizedCourses.length} 門課未列入學程採計或為抵免課程
                      </p>
                    )}
                  </div>
                )}
                {selectedPlanDetail === plan.id && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">已採計課程</p>
                    {plan.countedCourses.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">目前沒有採計到這個方案的課程。</p>
                    ) : (
                      plan.countedCourses.map((course, index) => {
                        const isNonRequiredProgramCourse =
                          plan.id === digitalHumanitiesProgramId &&
                          !isDfllRequiredCourseForProgramRule(course, admissionYear, studentStatus);
                        return (
                          <div
                            key={`${course.courseNo}-${course.name}-${course.semester}-${index}`}
                            className="rounded-md border border-gray-100 p-3 text-sm dark:border-gray-700"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium text-gray-900 dark:text-white">{course.name || "未命名課程"}</p>
                              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                {countableCredits(course, requirementProfile)} 學分
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {course.semester || "未選學期"}{course.offeredBy ? ` / ${course.offeredBy}` : ""}
                            </p>
                            {isNonRequiredProgramCourse && (
                              <p className="mt-1 text-xs text-green-700 dark:text-green-300">列入非原主修/雙主修必修學分</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {plan.notes && plan.notes.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-300">規則備註</summary>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {plan.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>

          {languageLiteracyRequirements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">必修</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">語言素養課程</p>
              </div>
              <div className="space-y-3">
                {languageLiteracyRequirements.map((requirement) => (
                  <div key={requirement.name}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{requirement.name}</span>
                      <span className={`text-xs font-medium ${requirement.remaining === 0 ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {requirement.completed} / {requirement.requiredCredits} 學分
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-2 rounded-full bg-green-600 dark:bg-green-400" style={{ width: `${requirement.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">成績為「抵」的課程會採計學分，但不列入 GPA。</p>
            </div>
          )}

          {choiceRequirementViews.map(({ requirement, options, completedOption }) => (
            <div key={requirement.title} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{requirementProfile.departmentName}必修</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{requirement.title}</p>
                </div>
                <p className={`text-sm font-semibold ${completedOption ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                  {completedOption ? `${completedOption.label}已達標` : `任一項${requirement.requiredCredits}學分`}
                </p>
              </div>
              <div className="space-y-3">
                {options.map((option) => (
                  <div key={option.id}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                      <span className={`text-xs font-medium ${option.remaining === 0 ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {option.completed} / {requirement.requiredCredits} 學分
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-2 rounded-full bg-green-600 dark:bg-green-400" style={{ width: `${option.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{requirement.description}</p>
            </div>
          ))}

          {dfllRequirementAudits && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">外文系111/112學年度</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">通識與專業需求檢查</p>
              </div>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                {dfllRequirementRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedDfllRequirementDetail((current) => (current === row.id ? "" : row.id))}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors ${
                      selectedDfllRequirementDetail === row.id
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "active:bg-gray-50 dark:active:bg-gray-700"
                    }`}
                  >
                    <span>{row.label}</span>
                    <span className="text-right">{row.summary}</span>
                  </button>
                ))}
              </div>
              {selectedDfllRequirementRow && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedDfllRequirementRow.label} 課程</p>
                  {selectedDfllRequirementRow.courses.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">目前沒有符合此需求的課程。</p>
                  ) : (
                    sortCoursesChronologically(selectedDfllRequirementRow.courses).map((course, index) => {
                      const creditStatus = getCourseCreditStatus(course);
                      const isBritishAmericanLiteratureOverflow =
                        selectedDfllRequirementRow.id === "british-american-literature" &&
                        dfllRequirementAudits.britishAmericanLiterature.overflowCourses.includes(course);
                      const detailNote = isBritishAmericanLiteratureOverflow
                        ? "英美文學已達12學分，這門課改採計為系專業選修。"
                        : creditStatus.note;
                      return (
                      <div
                        key={`${course.courseNo}-${course.name}-${course.semester}-${index}`}
                        className={`rounded-md border p-3 text-sm ${
                          creditStatus.isUncounted || isBritishAmericanLiteratureOverflow
                            ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                            : "border-gray-100 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-gray-900 dark:text-white">{course.name || "未命名課程"}</p>
                          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{countableCredits(course, requirementProfile)} 學分</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {course.semester || "未選學期"}{course.offeredBy ? ` / ${course.offeredBy}` : ""}
                        </p>
                        {detailNote && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{detailNote}</p>}
                      </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {requirementProfile.externalCreditLimit !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <button
              type="button"
              onClick={() => setShowExternalCreditCourses((current) => !current)}
              className="mb-2 flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">上限</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">外系學分</p>
              </div>
              <p className={`text-sm font-semibold ${primaryCreditAudit.externalOverLimit > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                {primaryCreditAudit.acceptedExternalCredits} / {requirementProfile.externalCreditLimit} 學分
              </p>
            </button>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 mb-2">
              <div
                className={`h-2 rounded-full ${primaryCreditAudit.externalOverLimit > 0 ? "bg-red-600 dark:bg-red-400" : "bg-blue-600 dark:bg-blue-400"}`}
                style={{ width: `${Math.min((primaryCreditAudit.externalCredits / requirementProfile.externalCreditLimit) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              本系承認外系學分最多{requirementProfile.externalCreditLimit}學分{primaryCreditAudit.externalOverLimit > 0 ? `，目前有 ${primaryCreditAudit.externalOverLimit} 學分超出上限未計入主修總學分。` : "。"}
              {primaryCreditAudit.generalEducationOverflowCredits > 0 && ` 超修通識已採計 ${primaryCreditAudit.acceptedGeneralEducationOverflowCredits} / ${dfllGeneralEdOverflowExternalLimit} 學分。`}
            </p>
            {showExternalCreditCourses && (
              <div className="mt-3 space-y-2">
                {primaryCreditAudit.externalCourseAudits.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">目前沒有列入外系學分計算的課程。</p>
                ) : (
                  primaryCreditAudit.externalCourseAudits.map(({ course, credits, acceptedCredits, uncountedCredits }, index) => (
                    <div
                      key={`${course.courseNo}-${course.name}-${course.semester}-${index}`}
                      className={`rounded-md border p-3 text-sm ${
                        uncountedCredits > 0
                          ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                          : "border-gray-100 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-gray-900 dark:text-white">{course.name || "未命名課程"}</p>
                        <span className={`shrink-0 text-xs font-medium ${uncountedCredits > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {acceptedCredits > 0 ? `採計 ${acceptedCredits}` : "不採計"} / {credits} 學分
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {course.semester || "未選學期"}{course.offeredBy ? ` / ${course.offeredBy}` : ""}{uncountedCredits > 0 ? ` / ${uncountedCredits} 學分超出上限` : ""}
                      </p>
                      {uncountedCredits > 0 && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{getCourseCreditStatus(course).note}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          )}

          {nonGraduationRequirement && nonGraduationRequirement.completed > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">不計畢業總學分</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{nonGraduationRequirement.title}</p>
                </div>
                <p className={`text-sm font-semibold ${nonGraduationRequirement.done ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                  {nonGraduationRequirement.done ? "已達標" : `${nonGraduationRequirement.requiredCourses - nonGraduationRequirement.completed} 門缺`}
                </p>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 mb-2">
                <div
                  className="h-2 rounded-full bg-green-600 dark:bg-green-400"
                  style={{
                    width: `${Math.min((nonGraduationRequirement.completed / nonGraduationRequirement.requiredCourses) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                已完成 {nonGraduationRequirement.completed} / {nonGraduationRequirement.requiredCourses} 門，保留在需求檢查中但不加進總學分。
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(groupedCredits).filter(([, credits]) => credits > 0).map(([groupName, credits]) => (
              <button
                key={groupName}
                type="button"
                onClick={() => setSelectedCategorySummary((current) => (current === groupName ? "" : groupName))}
                className={`rounded-lg border p-4 text-left shadow-sm transition-colors ${
                  selectedCategorySummary === groupName
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                    : "border-gray-200 bg-white active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
                }`}
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{groupName}</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{credits}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">學分</p>
              </button>
            ))}
          </div>

          {selectedCategorySummary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedCategorySummary} 課程</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCategoryCourses.length} 門</p>
              </div>
              <div className="space-y-2">
                {selectedCategoryCourses.map((course, index) => {
                  const creditStatus = getCourseCreditStatus(course);
                  return (
                  <div
                    key={`${course.courseNo}-${course.name}-${course.semester}-${index}`}
                    className={`rounded-md border p-3 text-sm ${
                      creditStatus.isUncounted
                        ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                        : "border-gray-100 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900 dark:text-white">{course.name || "未命名課程"}</p>
                      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{course.semester || "未選學期"}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {course.credits} 學分 / {course.grade || "-"}{course.offeredBy ? ` / ${course.offeredBy}` : ""}
                    </p>
                    {creditStatus.note && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{creditStatus.note}</p>}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {courses.length > 0 && (
            <button
              onClick={clearTranscript}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700"
            >
              清空課程
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
