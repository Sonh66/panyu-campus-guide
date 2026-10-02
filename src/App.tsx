import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowUpRight,
  Search,
  Sparkles,
  Shirt,
  Utensils,
  House,
  Bike,
  HeartPulse,
  BookOpen,
  GraduationCap,
  Compass,
  X,
  Menu,
  Send,
  ExternalLink,
  ChevronRight,
  Check,
  LoaderCircle,
  MapPin,
  Leaf,
  ShieldCheck,
  MessageCircle,
  School,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import catalog from "./catalog.json";
import { localAnswer, searchCatalog } from "../server/catalog-search.mjs";

gsap.registerPlugin(ScrollTrigger);
const pagesDeployment = import.meta.env.VITE_DEPLOY_TARGET === "github-pages";
const sourceUrl = "https://www.kdocs.cn/l/cd8vwmB6EhQt";
type Entry = (typeof catalog)[number];
type Category = {
  title: string;
  short: string;
  description: string;
  color: string;
  icon: LucideIcon;
  image: string;
};
const categories: Record<string, Category> = {
  clothes: {
    title: "衣物与穿搭",
    short: "衣",
    description: "洗衣、换季与衣物整理",
    color: "pink",
    icon: Shirt,
    image: "clothes",
  },
  food: {
    title: "今天吃什么",
    short: "食",
    description: "校园美食与餐饮信息",
    color: "yellow",
    icon: Utensils,
    image: "food",
  },
  housing: {
    title: "安心住下来",
    short: "住",
    description: "宿舍、报修与生活用品",
    color: "blue",
    icon: House,
    image: "room",
  },
  travel: {
    title: "出发去看看",
    short: "行",
    description: "到校、地铁与返乡",
    color: "green",
    icon: Bike,
    image: "bike",
  },
  health: {
    title: "照顾好自己",
    short: "医",
    description: "健康、医保与学生支持",
    color: "purple",
    icon: HeartPulse,
    image: "health",
  },
  study: {
    title: "学习与办事",
    short: "学",
    description: "教务、图书馆与奖助",
    color: "blue",
    icon: BookOpen,
    image: "campus-illustration",
  },
  career: {
    title: "走向下一站",
    short: "业",
    description: "实习、就业与权益保障",
    color: "green",
    icon: GraduationCap,
    image: "campus-illustration",
  },
};
const stages = [
  {
    id: "arrival",
    title: "初来校园",
    subtitle: "把报到与入住安排好",
    icon: School,
    words: ["新生报到", "到校交通", "宿舍入住"],
  },
  {
    id: "campus",
    title: "在校日常",
    subtitle: "学习生活，都有去处",
    icon: BookOpen,
    words: ["衣食住行医", "学习资源", "校园办事"],
  },
  {
    id: "career",
    title: "实习与成长",
    subtitle: "为下一步积蓄力量",
    icon: Compass,
    words: ["实习招聘", "协议与权益", "学生支持"],
  },
  {
    id: "graduation",
    title: "奔赴下一站",
    subtitle: "从容完成毕业与离校",
    icon: GraduationCap,
    words: ["毕业事项", "物品整理", "返乡出行"],
  },
];
type Route =
  | { page: "home" }
  | { page: "guide"; category: string; query: string }
  | { page: "journey"; stage: string }
  | { page: "ask" };
function readRoute(): Route {
  const hash = window.location.hash.slice(1);
  const [pathname, parameters] = hash.split("?");
  const query = new URLSearchParams(parameters);
  if (pathname === "/guide")
    return {
      page: "guide",
      category: query.get("category") || "all",
      query: query.get("q") || "",
    };
  if (pathname === "/journey")
    return { page: "journey", stage: query.get("stage") || "arrival" };
  if (pathname === "/ask") return { page: "ask" };
  return { page: "home" };
}
function guideHref(category = "all", query = "") {
  return `#/guide?category=${encodeURIComponent(category)}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
}
function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function CategoryIcon({
  category,
  size = 22,
}: {
  category: string;
  size?: number;
}) {
  const Icon = categories[category]?.icon || Compass;
  return <Icon size={size} aria-hidden="true" />;
}
function Brand({ small = false }: { small?: boolean }) {
  return (
    <a
      className={`brand ${small ? "brand-small" : ""}`}
      href="#/"
      aria-label="番禺校园指南首页"
    >
      <span className="brand-mark">
        <School size={24} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span>
        番禺校园指南<small>学伴 · 让每一步都有方向</small>
      </span>
    </a>
  );
}
function EntryCard({
  entry,
  onOpen,
}: {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}) {
  return (
    <button
      className={`entry-card tone-${categories[entry.category].color}`}
      onClick={() => onOpen(entry)}
    >
      <span className="entry-icon">
        <CategoryIcon category={entry.category} />
      </span>
      <span className="entry-copy">
        <strong>{entry.title}</strong>
        <span>{entry.summary}</span>
        <small>
          {entry.sourceLabel}
          {entry.sourceState === "provided" ? " · 原文入口" : ""}
        </small>
      </span>
      <span className="entry-arrow">
        <ArrowUpRight size={19} aria-hidden="true" />
      </span>
    </button>
  );
}
function SearchBox({
  onSearch,
  initial = "",
  compact = false,
}: {
  onSearch: (query: string) => void;
  initial?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(initial);
  useEffect(() => setQuery(initial), [initial]);
  return (
    <form
      className={`search-box ${compact ? "compact" : ""}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <Search aria-hidden="true" size={22} />
      <label
        className="sr-only"
        htmlFor={compact ? "directory-search" : "home-search"}
      >
        搜索校园服务
      </label>
      <input
        id={compact ? "directory-search" : "home-search"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="想找什么？试试宿舍报修、食堂、到校交通"
        maxLength={100}
      />
      <button type="submit">
        搜索
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
function SourceNote() {
  return (
    <div className="source-note">
      <BookOpen size={19} aria-hidden="true" />
      <p>
        原文攻略需在 WPS
        查看。这里先汇集分类入口与学校官网，具体安排以来源最新说明为准。
      </p>
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
        查看原文
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </div>
  );
}
function Home({
  onOpen,
  onAsk,
}: {
  onOpen: (entry: Entry) => void;
  onAsk: (query: string) => void;
}) {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="location-label">
            <MapPin size={16} aria-hidden="true" />
            暨南大学 · 番禺校区
          </span>
          <h1>
            把校园生活，
            <br />
            过成喜欢的样子。
          </h1>
          <p>
            从初来乍到，到奔赴下一站。
            <br />
            你的校园生活指南，随时在这里。
          </p>
          <a className="hero-link" href="#/journey?stage=arrival">
            第一次来？从迎新开始
            <ChevronRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="hero-scene">
          <img
            src={`${import.meta.env.BASE_URL}images/campus-illustration.webp`}
            alt="亚热带校园、湖畔步道与骑车学生的原创意象插画"
            fetchPriority="high"
            width="1672"
            height="941"
          />
          <div className="scene-caption">校园生活意象插画</div>
          <div className="scene-label">
            <Leaf size={16} aria-hidden="true" />
            <span>去发现校园里的小美好</span>
          </div>
        </div>
        <div className="hero-search">
          <SearchBox
            onSearch={(query) => {
              window.location.hash = guideHref("all", query);
            }}
          />
          <div className="hot-search">
            <span>大家常找</span>
            {["宿舍报修", "新生报到", "图书馆", "实习招聘"].map((query) => (
              <button
                key={query}
                onClick={() => {
                  window.location.hash = guideHref("all", query);
                }}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="section-block" aria-labelledby="living-heading">
        <div className="section-heading">
          <div>
            <h2 id="living-heading">生活的每一面，都照顾到</h2>
            <p>选一个分类，找到你需要的那一页。</p>
          </div>
          <a className="text-link" href={guideHref()}>
            全部指南
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="category-grid">
          {Object.entries(categories)
            .slice(0, 5)
            .map(([key, category]) => (
              <a
                key={key}
                href={guideHref(key)}
                className={`category-card tone-${category.color}`}
              >
                <div className="category-text">
                  <span className="category-character">{category.short}</span>
                  <CategoryIcon category={key} size={21} />
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                </div>
                <img
                  src={`${import.meta.env.BASE_URL}images/${category.image}.jpg`}
                  alt=""
                  loading="lazy"
                  width="300"
                  height="190"
                />
                <span className="category-go">
                  <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </a>
            ))}
        </div>
      </section>
      <section className="home-bottom section-block">
        <div className="journey-section">
          <div className="section-heading">
            <div>
              <h2>你的大学，每一站</h2>
              <p>不同阶段，总有刚好需要的指南。</p>
            </div>
          </div>
          <div className="journey-grid">
            {stages.map((stage, index) => (
              <a
                className="journey-card"
                href={`#/journey?stage=${stage.id}`}
                key={stage.id}
              >
                <span className="journey-number">0{index + 1}</span>
                <stage.icon size={23} aria-hidden="true" />
                <h3>{stage.title}</h3>
                <p>{stage.subtitle}</p>
                <span className="journey-tags">
                  {stage.words.slice(0, 2).join(" / ")}
                </span>
                <ChevronRight
                  size={18}
                  className="journey-arrow"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </div>
        <aside className="assistant-teaser">
          <div className="assistant-symbol">
            <Sparkles size={28} aria-hidden="true" />
          </div>
          <h2>
            说出需求，
            <br />
            一起找到答案。
          </h2>
          <p>
            不用记住每一个入口。
            <br />
            校园向导帮你找到相关指南。
          </p>
          <button
            className="teaser-question"
            onClick={() => onAsk("宿舍空调坏了怎么报修？")}
          >
            “宿舍空调坏了怎么办？”
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>
          <button className="primary-button" onClick={() => onAsk("")}>
            问问校园向导
            <MessageCircle size={17} aria-hidden="true" />
          </button>
        </aside>
      </section>
      <section className="section-block quick-section">
        <div className="section-heading">
          <div>
            <h2>常用入口，不用再翻</h2>
          </div>
        </div>
        <div className="quick-links">
          {[
            {
              title: "番禺校区官网",
              url: "https://panyu.jnu.edu.cn/",
              icon: School,
            },
            {
              title: "教务与学业",
              url: "https://jw.jnu.edu.cn/",
              icon: BookOpen,
            },
            { title: "图书馆", url: "https://lib.jnu.edu.cn/", icon: BookOpen },
            {
              title: "实习与就业",
              url: "https://career.jnu.edu.cn/",
              icon: GraduationCap,
            },
          ].map((link) => (
            <a
              key={link.title}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <link.icon size={20} aria-hidden="true" />
              {link.title}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
        <SourceNote />
      </section>
    </>
  );
}
function Guide({
  route,
  onOpen,
}: {
  route: Extract<Route, { page: "guide" }>;
  onOpen: (entry: Entry) => void;
}) {
  const matches = route.query ? searchCatalog(route.query, catalog) : catalog;
  const entries = matches.filter(
    (entry: Entry) =>
      route.category === "all" || entry.category === route.category,
  );
  const category = categories[route.category];
  return (
    <div className="inner-page">
      <div className="page-heading">
        <a className="back-link" href="#/">
          <ChevronLeft size={16} aria-hidden="true" />
          回到首页
        </a>
        <span className="location-label">
          <Compass size={17} aria-hidden="true" />
          按分类寻找，也按需求寻找
        </span>
        <h1>{category ? category.title : "校园生活指南"}</h1>
        <p>
          {category
            ? category.description
            : "把分散的服务入口，收进一份好找的校园指南。"}
        </p>
      </div>
      <SearchBox
        compact
        initial={route.query}
        onSearch={(query) => {
          window.location.hash = guideHref(route.category, query);
        }}
      />
      <nav className="filter-tabs" aria-label="服务分类">
        <a
          className={route.category === "all" ? "selected" : ""}
          aria-current={route.category === "all" ? "page" : undefined}
          href={guideHref("all", route.query)}
        >
          全部
        </a>
        {Object.entries(categories).map(([key, category]) => (
          <a
            key={key}
            className={route.category === key ? "selected" : ""}
            aria-current={route.category === key ? "page" : undefined}
            href={guideHref(key, route.query)}
          >
            <CategoryIcon category={key} size={18} />
            {category.title}
          </a>
        ))}
      </nav>
      <div className="results-label" role="status">
        {route.query ? `“${route.query}”的相关入口` : "可浏览的服务入口"}
        <span>{entries.length} 项</span>
      </div>
      {entries.length ? (
        <div className="entries-grid">
          {entries.map((entry: Entry) => (
            <EntryCard key={entry.id} entry={entry} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={35} aria-hidden="true" />
          <h2>暂时没有找到相关指南</h2>
          <p>试试更具体的关键词，或切换到全部分类。</p>
          <a className="primary-button" href={guideHref()}>
            查看全部指南
          </a>
        </div>
      )}
      <SourceNote />
    </div>
  );
}
function Journey({
  stageId,
  onOpen,
}: {
  stageId: string;
  onOpen: (entry: Entry) => void;
}) {
  const stage =
    stages.find((candidate) => candidate.id === stageId) || stages[0];
  const entries = catalog.filter((entry) => entry.stages.includes(stage.id));
  return (
    <div className="inner-page">
      <div className="page-heading">
        <a className="back-link" href="#/">
          <ChevronLeft size={16} aria-hidden="true" />
          回到首页
        </a>
        <span className="location-label">
          <GraduationCap size={18} aria-hidden="true" />
          从入学到毕业
        </span>
        <h1>{stage.title}</h1>
        <p>{stage.subtitle}。按自己的需要，一项一项找到对应入口。</p>
      </div>
      <nav className="stage-tabs" aria-label="大学阶段">
        {stages.map((candidate, index) => (
          <a
            key={candidate.id}
            href={`#/journey?stage=${candidate.id}`}
            aria-current={candidate.id === stage.id ? "page" : undefined}
            className={candidate.id === stage.id ? "selected" : ""}
          >
            <span>0{index + 1}</span>
            <candidate.icon size={19} aria-hidden="true" />
            {candidate.title}
          </a>
        ))}
      </nav>
      <div className="journey-intro">
        <div>
          <stage.icon size={38} strokeWidth={1.4} aria-hidden="true" />
          <h2>这一站，先从这些开始</h2>
          <p>
            {stage.words.join("、")}
            。这里提供查询与办理线索，具体材料和期限请查看最新官方通知。
          </p>
        </div>
        <div className="stage-word">
          {stage.id === "arrival"
            ? "你好，同学"
            : stage.id === "graduation"
              ? "前程，自在"
              : stage.id === "career"
                ? "向前一步"
                : "日常，也精彩"}
        </div>
      </div>
      <div className="entries-grid">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onOpen={onOpen} />
        ))}
      </div>
      <SourceNote />
    </div>
  );
}
type Reply = {
  mode: "local" | "model";
  answer: string;
  recommendations: string[];
  categories: string[];
};
type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; reply: Reply };
function isReply(value: unknown): value is Reply {
  if (
    typeof value !== "object" ||
    value === null ||
    !("mode" in value) ||
    !("answer" in value) ||
    !("recommendations" in value) ||
    !("categories" in value)
  )
    return false;
  return (
    (value.mode === "local" || value.mode === "model") &&
    typeof value.answer === "string" &&
    Array.isArray(value.recommendations) &&
    value.recommendations.every(
      (id) =>
        typeof id === "string" && catalog.some((entry) => entry.id === id),
    ) &&
    Array.isArray(value.categories) &&
    value.categories.every(
      (category) =>
        typeof category === "string" && Boolean(categories[category]),
    )
  );
}
function errorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  )
    return value.error;
  return "暂时无法连接，请稍后重试。";
}
function Chat({
  initialQuestion,
  onOpen,
}: {
  initialQuestion: string;
  onOpen: (entry: Entry) => void;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"local" | "model">("local");
  const [connected, setConnected] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const sendLock = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    if (pagesDeployment)
      return () => {
        abort.abort();
        controller.current?.abort();
      };
    fetch("/api/status", { signal: abort.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((status) => {
        if (status.mode === "model" || status.mode === "local") {
          setMode(status.mode);
          setConnected(true);
        }
      })
      .catch(() => {});
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    messageEnd.current?.scrollIntoView({
      behavior: reducedMotion() ? "instant" : "smooth",
      block: "nearest",
    });
  }, [messages, pending]);
  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendLock.current) return;
    sendLock.current = true;
    setQuestion("");
    setError("");
    setPending(true);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: trimmed },
    ]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let result: unknown;
      if (connected) {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
          signal: abort.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload));
        result = payload;
      } else {
        result = localAnswer(trimmed, catalog);
        await new Promise((resolve) =>
          setTimeout(resolve, reducedMotion() ? 0 : 320),
        );
      }
      if (abort.signal.aborted) return;
      if (!isReply(result))
        throw new Error("返回的指南无法确认，请按分类查找。");
      const reply = result;
      setMode(reply.mode);
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: reply.answer, reply },
      ]);
    } catch (problem) {
      if (!abort.signal.aborted)
        setError(
          problem instanceof Error
            ? problem.message
            : "暂时无法连接，请稍后重试。",
        );
    } finally {
      if (!abort.signal.aborted) {
        setPending(false);
        sendLock.current = false;
        input.current?.focus();
      }
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialQuestion && !initialSent.current) {
        initialSent.current = true;
        void ask(initialQuestion);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialQuestion]);
  return (
    <div className="chat">
      <div className="chat-status">
        <span>
          <Sparkles size={15} aria-hidden="true" />
          {mode === "model" ? "AI 校园向导" : "站内智能检索"}
        </span>
        <small>根据已有资料寻找入口</small>
      </div>
      <div
        className="chat-scroll"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-orbit">
              <Sparkles size={30} aria-hidden="true" />
            </div>
            <h2>今天，想找什么？</h2>
            <p>
              说说你的需求，我帮你找到相关指南。
              <br />
              也可以从下面的问题开始。
            </p>
            <div className="suggested-questions">
              {[
                "宿舍空调坏了怎么报修？",
                "刚入学，需要准备什么？",
                "想找实习招聘信息",
                "到校可以怎么坐地铁？",
              ].map((text) => (
                <button key={text} onClick={() => void ask(text)}>
                  {text}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.role}`}>
              <div className="message-avatar">
                {message.role === "assistant" ? (
                  <Sparkles size={18} aria-hidden="true" />
                ) : (
                  "我"
                )}
              </div>
              <div className="message-body">
                <p>{message.text}</p>
                {message.role === "assistant" && (
                  <>
                    <div className="recommendations">
                      {message.reply.recommendations.map((id) => {
                        const entry = catalog.find(
                          (candidate) => candidate.id === id,
                        );
                        return entry ? (
                          <button key={id} onClick={() => onOpen(entry)}>
                            <CategoryIcon category={entry.category} size={18} />
                            <span>
                              {entry.title}
                              <small>{entry.sourceLabel}</small>
                            </span>
                            <ChevronRight size={17} aria-hidden="true" />
                          </button>
                        ) : null;
                      })}
                    </div>
                    {message.reply.categories.length > 0 && (
                      <div className="chat-category-links">
                        {message.reply.categories.map((category) => (
                          <a href={guideHref(category)} key={category}>
                            浏览{categories[category].title}
                            <ChevronRight size={13} aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        {pending && (
          <div className="chat-thinking" role="status">
            <LoaderCircle size={18} aria-hidden="true" />
            正在查找相关入口…
          </div>
        )}
        <div ref={messageEnd} />
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label className="sr-only" htmlFor="assistant-question">
          向校园向导提问
        </label>
        <input
          id="assistant-question"
          ref={input}
          placeholder="例如：宿舍空调坏了怎么办？"
          value={question}
          maxLength={1000}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          type="submit"
          aria-label="发送问题"
          disabled={pending || !question.trim()}
        >
          <Send size={19} aria-hidden="true" />
        </button>
      </form>
      <p className="chat-footnote">
        {mode === "local"
          ? "当前使用站内检索，不生成未核实的信息。"
          : "回答仅供指引，请核对来源的最新说明。"}
        点击条目后由你决定是否打开来源。
      </p>
    </div>
  );
}
function AskPage({ onOpen }: { onOpen: (entry: Entry) => void }) {
  return (
    <div className="inner-page ask-page">
      <div className="page-heading">
        <span className="location-label">
          <Sparkles size={17} aria-hidden="true" />
          校园向导
        </span>
        <h1>不用翻遍所有页面。</h1>
        <p>从一个问题开始，找到与你有关的校园指南。</p>
      </div>
      <div className="ask-layout">
        <aside className="ask-sidebar">
          <h2>也可以自己逛逛</h2>
          {Object.entries(categories).map(([key, category]) => (
            <a href={guideHref(key)} key={key}>
              <CategoryIcon category={key} size={19} />
              {category.title}
              <ChevronRight size={16} aria-hidden="true" />
            </a>
          ))}
          <div className="ask-source">
            <ShieldCheck size={22} aria-hidden="true" />
            <strong>有来源，才有方向</strong>
            <p>入口来自学校官网、公开服务网站及你提供的原文攻略。</p>
          </div>
        </aside>
        <div className="full-chat">
          <Chat initialQuestion="" onOpen={onOpen} />
        </div>
      </div>
    </div>
  );
}
function EntryDialog({
  entry,
  onClose,
}: {
  entry: Entry | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (entry && !element.open) {
      element.showModal();
      if (!reducedMotion())
        gsap.fromTo(
          element,
          { opacity: 0, y: 22, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out" },
        );
    }
    if (!entry && element.open) element.close();
    return () => {
      gsap.killTweensOf(element);
    };
  }, [entry]);
  return (
    <dialog
      ref={dialog}
      className="entry-dialog"
      aria-labelledby="detail-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {entry && (
        <>
          <button
            className="dialog-close"
            aria-label="关闭指南详情"
            onClick={onClose}
          >
            <X size={21} aria-hidden="true" />
          </button>
          <div
            className={`detail-symbol tone-${categories[entry.category].color}`}
          >
            <CategoryIcon category={entry.category} size={29} />
          </div>
          <span className="detail-source">{entry.sourceLabel}</span>
          <h2 id="detail-title">{entry.title}</h2>
          <p className="detail-summary">{entry.summary}</p>
          <h3>从这里开始</h3>
          <ol className="detail-steps">
            {entry.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="detail-note">
            <ShieldCheck size={19} aria-hidden="true" />
            <p>
              {entry.sourceState === "provided"
                ? "此入口将打开原文攻略，可能需要登录 WPS。尚未读取原文具体条目。"
                : "此入口将打开官方网站。具体条件、时间和办理方式请核对最新通知。"}
            </p>
          </div>
          <a
            className="primary-button detail-cta"
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            打开{entry.sourceLabel.split(" · ")[0]}
            <ExternalLink size={17} aria-hidden="true" />
          </a>
          <a
            className="detail-category"
            href={guideHref(entry.category)}
            onClick={onClose}
          >
            继续浏览{categories[entry.category].title}
          </a>
        </>
      )}
    </dialog>
  );
}
function AssistantDialog({
  open,
  question,
  onClose,
  onOpen,
}: {
  open: boolean;
  question: string;
  onClose: () => void;
  onOpen: (entry: Entry) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      if (!reducedMotion())
        gsap.fromTo(
          element,
          { x: 50, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
        );
    }
    if (!open && element.open) element.close();
    return () => {
      gsap.killTweensOf(element);
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="assistant-dialog"
      aria-labelledby="assistant-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="assistant-dialog-header">
        <h2 id="assistant-title">
          <Sparkles size={20} aria-hidden="true" />
          校园向导
        </h2>
        <button onClick={onClose} aria-label="关闭校园向导">
          <X size={21} aria-hidden="true" />
        </button>
      </div>
      {open && <Chat initialQuestion={question} onOpen={onOpen} />}
    </dialog>
  );
}
export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [assistant, setAssistant] = useState({ open: false, question: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const main = useRef<HTMLElement>(null);
  const entrance = useRef<gsap.Context | null>(null);
  const navigationTween = useRef<gsap.core.Tween | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    function navigate() {
      const next = readRoute();
      setMenuOpen(false);
      setAssistant({ open: false, question: "" });
      setEntry(null);
      navigationTween.current?.kill();
      entrance.current?.revert();
      const target = main.current;
      if (!target || reducedMotion() || motionPaused) {
        setRoute(next);
        return;
      }
      navigationTween.current = gsap.to(target, {
        opacity: 0,
        y: -9,
        duration: 0.14,
        ease: "power1.in",
        overwrite: true,
        onComplete: () => setRoute(next),
      });
    }
    window.addEventListener("hashchange", navigate);
    return () => {
      window.removeEventListener("hashchange", navigate);
      navigationTween.current?.kill();
    };
  }, [motionPaused]);
  useLayoutEffect(() => {
    const target = main.current;
    if (!target) return;
    entrance.current?.revert();
    const animate = !reducedMotion() && !motionPaused;
    window.scrollTo({ top: 0, behavior: "instant" });
    entrance.current = gsap.context(() => {
      gsap.set(target, { opacity: 1, y: 0 });
      if (animate) {
        gsap.fromTo(
          target,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
        );
        gsap.fromTo(
          ".category-card, .entry-card, .journey-card",
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.045,
            ease: "power3.out",
            delay: 0.08,
            clearProps: "transform,opacity",
          },
        );
        if (route.page === "home") {
          gsap.fromTo(
            ".hero-copy > *",
            { y: 22, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.09,
              duration: 0.55,
              ease: "power3.out",
              delay: 0.05,
            },
          );
          gsap.fromTo(
            ".hero-scene",
            { clipPath: "inset(0 100% 0 0 round 24px)" },
            {
              clipPath: "inset(0 0% 0 0 round 24px)",
              duration: 1,
              ease: "power3.inOut",
            },
          );
          gsap.to(".hero-scene img", {
            yPercent: 7,
            ease: "none",
            scrollTrigger: {
              trigger: ".home-hero",
              start: "top top",
              end: "bottom top",
              scrub: 1,
            },
          });
          gsap.fromTo(
            ".scene-label",
            { y: 0 },
            {
              y: -7,
              duration: 2.7,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            },
          );
        }
      }
    }, target);
    if (initialized.current) {
      const heading = target.querySelector("h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    initialized.current = true;
    return () => entrance.current?.revert();
  }, [route, motionPaused]);
  useEffect(() => {
    document.body.style.overflow = entry || assistant.open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [entry, assistant.open]);
  function ask(question: string) {
    setAssistant({ open: true, question });
  }
  function openEntry(next: Entry) {
    setEntry(next);
  }
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <button
            className="mobile-menu"
            aria-label="展开导航"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
          <nav
            className={menuOpen ? "header-nav open" : "header-nav"}
            aria-label="主要导航"
          >
            <a
              href="#/"
              className={route.page === "home" ? "active" : ""}
              aria-current={route.page === "home" ? "page" : undefined}
            >
              发现校园
            </a>
            <a
              href={guideHref()}
              className={route.page === "guide" ? "active" : ""}
              aria-current={route.page === "guide" ? "page" : undefined}
            >
              生活指南
            </a>
            <a
              href="#/journey?stage=arrival"
              className={route.page === "journey" ? "active" : ""}
              aria-current={route.page === "journey" ? "page" : undefined}
            >
              入学到毕业
            </a>
            <a
              href="#/ask"
              className={route.page === "ask" ? "active" : ""}
              aria-current={route.page === "ask" ? "page" : undefined}
            >
              <Sparkles size={16} aria-hidden="true" />
              校园向导
            </a>
          </nav>
          <a
            className="header-source"
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            原文攻略
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} ref={main} className="main-content">
        {route.page === "home" ? (
          <Home onOpen={openEntry} onAsk={ask} />
        ) : route.page === "guide" ? (
          <Guide route={route} onOpen={openEntry} />
        ) : route.page === "journey" ? (
          <Journey stageId={route.stage} onOpen={openEntry} />
        ) : (
          <AskPage onOpen={openEntry} />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Brand small />
          <p>从入学到毕业，校园生活有处可寻。</p>
        </div>
        <div className="footer-actions">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            番禺校区攻略宝典
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <button
            aria-pressed={motionPaused}
            onClick={() => setMotionPaused(!motionPaused)}
          >
            {motionPaused ? (
              <Check size={15} aria-hidden="true" />
            ) : (
              <Leaf size={15} aria-hidden="true" />
            )}
            {motionPaused ? "动态效果已暂停" : "暂停动态效果"}
          </button>
          <small>图片为生活场景表达，非校园实景。</small>
        </div>
      </footer>
      {route.page !== "ask" && (
        <button
          className="floating-assistant"
          onClick={() => ask("")}
          aria-label="打开校园向导"
        >
          <Sparkles size={22} aria-hidden="true" />
          <span>问问向导</span>
        </button>
      )}
      <AssistantDialog
        open={assistant.open}
        question={assistant.question}
        onClose={() => setAssistant({ open: false, question: "" })}
        onOpen={openEntry}
      />
      <EntryDialog entry={entry} onClose={() => setEntry(null)} />
    </>
  );
}
