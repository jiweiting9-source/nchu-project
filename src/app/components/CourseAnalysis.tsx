import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";

type Level = "beginner" | "basic" | "intermediate" | "advanced";
type LearningStyle = "project" | "exam" | "career" | "interest";

type KnowledgeProfile = {
  id: string;
  label: string;
  keywords: string[];
  foundations: string[];
  practiceIdeas: string[];
  checkpoints: string[];
};

type LearningResource = {
  name: string;
  description: string;
  searchUrl: (topic: string) => string;
};

const knowledgeProfiles: KnowledgeProfile[] = [
  {
    id: "programming",
    label: "程式與軟體開發",
    keywords: ["python", "javascript", "typescript", "react", "程式", "網頁", "app", "軟體", "資料結構"],
    foundations: ["語法與資料型態", "流程控制與函式", "除錯能力", "版本管理", "小型專案架構"],
    practiceIdeas: ["做一個待辦清單或資料查詢工具", "閱讀一個小型開源專案", "把學到的概念整理成可重用筆記"],
    checkpoints: ["能獨立寫出可執行作品", "能解釋錯誤訊息並修正", "能把需求拆成多個小功能"],
  },
  {
    id: "data",
    label: "資料分析與 AI",
    keywords: ["ai", "人工智慧", "機器學習", "資料", "統計", "excel", "power bi", "tableau", "分析"],
    foundations: ["資料清理", "描述統計", "視覺化", "模型評估", "資料倫理"],
    practiceIdeas: ["找一份公開資料集做分析報告", "比較兩種模型或分析方法", "建立一頁式儀表板"],
    checkpoints: ["能說明資料來源與限制", "能用圖表回答問題", "能把分析結果轉成建議"],
  },
  {
    id: "language",
    label: "語言學習",
    keywords: ["英文", "日文", "韓文", "多益", "托福", "ielts", "口說", "聽力", "語言"],
    foundations: ["核心字彙", "句型與文法", "聽讀輸入", "口說輸出", "錯題回顧"],
    practiceIdeas: ["每天做短篇跟讀與錄音", "整理常用主題句庫", "用目標語言寫一段學習日誌"],
    checkpoints: ["能完成指定情境對話", "能聽懂符合程度的材料", "能穩定累積字彙與例句"],
  },
  {
    id: "business",
    label: "商業與職涯技能",
    keywords: ["行銷", "企劃", "簡報", "專案管理", "商業", "創業", "履歷", "面試", "職涯"],
    foundations: ["問題定義", "市場與使用者分析", "溝通表達", "成效指標", "案例拆解"],
    practiceIdeas: ["拆解一個真實品牌或產品案例", "寫一份一頁式企劃", "做一次 5 分鐘簡報練習"],
    checkpoints: ["能提出清楚假設", "能用資料支持觀點", "能把成果整理成作品集素材"],
  },
  {
    id: "creative",
    label: "創作與設計",
    keywords: ["設計", "攝影", "剪輯", "音樂", "繪畫", "寫作", "figma", "ui", "ux", "創作"],
    foundations: ["工具操作", "風格參考", "基本構圖", "作品拆解", "回饋修正"],
    practiceIdeas: ["臨摹並重做一個參考作品", "完成一個小型主題作品", "建立作品前後對照紀錄"],
    checkpoints: ["能說明設計選擇", "能穩定輸出作品", "能根據回饋做下一版"],
  },
];

const fallbackProfile: KnowledgeProfile = {
  id: "general",
  label: "通用學習主題",
  keywords: [],
  foundations: ["核心概念", "常用術語", "入門教材", "實作練習", "定期回顧"],
  practiceIdeas: ["整理主題心智圖", "完成一個小型成果", "找同學或朋友說明你學到的內容"],
  checkpoints: ["能說出這個主題的基本架構", "能完成一次實作或演練", "能列出下一階段要補強的問題"],
};

const learningResources: LearningResource[] = [
  {
    name: "NCHU 圖書館資源探索",
    description: "查找書籍、期刊、電子資料庫與校內可用學術資源。",
    searchUrl: (topic) => `https://www.google.com/search?q=${encodeURIComponent(`site:lib.nchu.edu.tw ${topic}`)}`,
  },
  {
    name: "MIT OpenCourseWare",
    description: "大學課程講義、作業與完整課程架構。",
    searchUrl: (topic) => `https://ocw.mit.edu/search/?q=${encodeURIComponent(topic)}`,
  },
  {
    name: "Coursera",
    description: "適合找結構化線上課程與專業證書。",
    searchUrl: (topic) => `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`,
  },
  {
    name: "Google Scholar",
    description: "查找論文、研究關鍵字與學術引用。",
    searchUrl: (topic) => `https://scholar.google.com/scholar?q=${encodeURIComponent(topic)}`,
  },
  {
    name: "YouTube 教學",
    description: "適合快速看操作示範、講解影片與實作流程。",
    searchUrl: (topic) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} 教學 tutorial`)}`,
  },
  {
    name: "GitHub",
    description: "搜尋開源範例、練習專案與學習路線整理。",
    searchUrl: (topic) => `https://github.com/search?q=${encodeURIComponent(`${topic} learning roadmap example`)}&type=repositories`,
  },
];

const levelLabels: Record<Level, string> = {
  beginner: "完全新手",
  basic: "有一點基礎",
  intermediate: "中階練習中",
  advanced: "想進階深化",
};

const styleLabels: Record<LearningStyle, string> = {
  project: "做出作品",
  exam: "準備考試",
  career: "工作應用",
  interest: "興趣探索",
};

const styleAdvice: Record<LearningStyle, string> = {
  project: "每週都要有可看見的小成果，最後收斂成一個完整作品。",
  exam: "優先建立題型清單與錯題回顧節奏，把練習時間固定下來。",
  career: "把學習任務綁定到真實工作情境，成果要能放進履歷或作品集。",
  interest: "保留探索空間，但仍要設定固定輸出，避免只看資料不行動。",
};

const getRecommendedWeeks = (weeklyHours: number, level: Level) => {
  const baseWeeks: Record<Level, number> = {
    beginner: 8,
    basic: 7,
    intermediate: 6,
    advanced: 5,
  };

  if (weeklyHours >= 12) return Math.max(4, baseWeeks[level] - 2);
  if (weeklyHours >= 7) return Math.max(5, baseWeeks[level] - 1);
  return baseWeeks[level] + 1;
};

const findProfile = (topic: string) => {
  const normalizedTopic = topic.toLowerCase();
  return (
    knowledgeProfiles.find((profile) => profile.keywords.some((keyword) => normalizedTopic.includes(keyword.toLowerCase()))) ??
    fallbackProfile
  );
};

const buildPlan = (
  topic: string,
  goal: string,
  weeklyHours: number,
  level: Level,
  style: LearningStyle,
  profile: KnowledgeProfile,
) => {
  const weeks = getRecommendedWeeks(weeklyHours, level);
  const inputHours = Math.max(1, Math.round(weeklyHours * 0.35));
  const practiceHours = Math.max(1, Math.round(weeklyHours * 0.45));
  const reviewHours = Math.max(1, weeklyHours - inputHours - practiceHours);
  const targetGoal = goal || `建立 ${topic} 的基礎能力`;

  return Array.from({ length: weeks }, (_, index) => {
    const week = index + 1;
    const foundation = profile.foundations[index % profile.foundations.length];
    const practice = profile.practiceIdeas[index % profile.practiceIdeas.length];

    if (week === 1) {
      return {
        week,
        focus: "建立學習地圖與基礎詞彙",
        tasks: [
          `用 ${inputHours} 小時整理 ${topic} 的核心概念、常見工具與必備詞彙。`,
          `用 ${practiceHours} 小時完成第一個小練習：${practice}。`,
          `用 ${reviewHours} 小時寫下目前會、不會、想問的問題。`,
        ],
      };
    }

    if (week === weeks) {
      return {
        week,
        focus: "完成成果整理與下一階段規劃",
        tasks: [
          `用 ${inputHours} 小時回顧所有筆記，補齊最常出錯的概念。`,
          `用 ${practiceHours} 小時完成目標成果：${targetGoal}。`,
          `用 ${reviewHours} 小時整理作品、心得或錯題，決定下一輪要深化的方向。`,
        ],
      };
    }

    return {
      week,
      focus: `聚焦 ${foundation}`,
      tasks: [
        `用 ${inputHours} 小時閱讀或觀看 ${foundation} 相關資料。`,
        `用 ${practiceHours} 小時做實作：${practice}。`,
        `用 ${reviewHours} 小時檢查進度，確認是否更接近「${targetGoal}」。`,
      ],
    };
  });
};

export function CourseAnalysis() {
  const [topic, setTopic] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [style, setStyle] = useState<LearningStyle>("project");
  const [hasGenerated, setHasGenerated] = useState(false);

  const cleanedTopic = topic.trim();
  const cleanedGoal = goal.trim();
  const canGenerate = cleanedTopic.length > 0;

  const profile = useMemo(() => findProfile(cleanedTopic), [cleanedTopic]);

  const learningPlan = useMemo(
    () => buildPlan(cleanedTopic || "新主題", cleanedGoal, weeklyHours, level, style, profile),
    [cleanedGoal, cleanedTopic, level, profile, style, weeklyHours],
  );

  const resourceLinks = useMemo(
    () =>
      learningResources.map((resource) => ({
        ...resource,
        url: resource.searchUrl(cleanedTopic || "自主學習"),
      })),
    [cleanedTopic],
  );

  const analysis = useMemo(() => {
    const pace =
      weeklyHours >= 12
        ? "高強度學習，適合快速衝刺。建議至少保留一半時間做輸出與實作。"
        : weeklyHours >= 7
          ? "穩定學習節奏，適合每週累積一個小成果並定期回顧。"
          : "輕量學習節奏，目標要拆小，重點是維持連續性。";

    const goalText = cleanedGoal || "先完成基礎理解，再做出一個可以展示或說明的成果。";

    return {
      pace,
      goalText,
      summary: `AI 已將「${cleanedTopic || "新主題"}」判斷為「${profile.label}」，並依照 ${levelLabels[level]}、每週 ${weeklyHours} 小時與「${styleLabels[style]}」目標，產生 ${learningPlan.length} 週學習計畫。`,
      method: styleAdvice[style],
    };
  }, [cleanedGoal, cleanedTopic, learningPlan.length, level, profile.label, style, weeklyHours]);

  return (
    <div className="px-3 py-4 md:px-6 md:py-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
          <BrainCircuit className="text-white" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">學習型 AI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            輸入想學的主題、可投入時間與目標，系統會用內建資料庫分析並提供外部資料入口與計畫表。
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">告訴 AI 你的學習需求</h2>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <BookOpen size={16} />
                想要學習什麼新的事物？
              </span>
              <input
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setHasGenerated(false);
                }}
                placeholder="例如：Python、英文口說、資料分析、機器學習、UI 設計"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Clock size={16} />
                每週可以學習多久？
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={weeklyHours}
                  onChange={(event) => {
                    setWeeklyHours(Number(event.target.value));
                    setHasGenerated(false);
                  }}
                  className="w-full accent-blue-600"
                />
                <span className="w-20 rounded-lg bg-gray-100 px-2 py-1 text-center text-sm font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                  {weeklyHours} 小時
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Target size={16} />
                想要達到的目標
              </span>
              <textarea
                value={goal}
                onChange={(event) => {
                  setGoal(event.target.value);
                  setHasGenerated(false);
                }}
                placeholder="例如：做出一個作品、通過考試、能在工作中使用、完成一份報告"
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              />
            </label>

            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <GraduationCap size={16} />
                目前程度
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(levelLabels) as Level[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setLevel(item);
                      setHasGenerated(false);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      level === item
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                        : "border-gray-200 bg-white text-gray-700 active:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:active:bg-gray-800"
                    }`}
                  >
                    {levelLabels[item]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <CheckCircle2 size={16} />
                學習目標類型
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(styleLabels) as LearningStyle[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setStyle(item);
                      setHasGenerated(false);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      style === item
                        ? "border-green-600 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/30 dark:text-green-300"
                        : "border-gray-200 bg-white text-gray-700 active:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:active:bg-gray-800"
                    }`}
                  >
                    {styleLabels[item]}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => setHasGenerated(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-blue-500 dark:active:bg-blue-600 dark:disabled:bg-gray-700"
            >
              <Search size={18} />
              分析並產生學習計畫
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI 學習分析</h2>
            </div>

            {hasGenerated ? (
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <p>{analysis.summary}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">學習節奏</p>
                    <p className="mt-1 font-medium text-blue-700 dark:text-blue-300">{analysis.pace}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">目標方向</p>
                    <p className="mt-1 font-medium text-green-700 dark:text-green-300">{analysis.goalText}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">學習方法</p>
                    <p className="mt-1 font-medium text-amber-700 dark:text-amber-300">{analysis.method}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                    <p className="text-xs text-gray-500 dark:text-gray-400">建議週數</p>
                    <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">{learningPlan.length} 週</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                請先輸入想學的主題。按下分析後，這裡會整理學習方向、時間安排、能力檢查點與目標拆解。
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Database size={18} className="text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">內建資料庫分析</h2>
            </div>
            {hasGenerated ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">判斷領域</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{profile.label}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">建議先補強</p>
                    <ul className="space-y-2">
                      {profile.foundations.slice(0, 4).map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <ListChecks size={16} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">能力檢查點</p>
                    <ul className="space-y-2">
                      {profile.checkpoints.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">目前內建程式、資料、語言、商業、創作等學習類型，可依輸入主題自動比對。</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <ExternalLink size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">外部網路資料庫</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {resourceLinks.map((resource) => (
                <a
                  key={resource.name}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-200 p-3 transition active:bg-gray-50 dark:border-gray-700 dark:active:bg-gray-900"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{resource.name}</span>
                    <ExternalLink size={15} className="shrink-0 text-gray-400" />
                  </div>
                  <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{resource.description}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-green-600 dark:text-green-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">學習計畫表</h2>
        </div>

        {hasGenerated ? (
          <div className="space-y-3">
            {learningPlan.map((item) => (
              <div key={item.week} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    第 {item.week} 週
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.focus}</h3>
                </div>
                <ul className="space-y-2">
                  {item.tasks.map((task) => (
                    <li key={task} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <ListChecks size={16} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">學習計畫會在分析後自動產生。</p>
        )}
      </section>
    </div>
  );
}
