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
  KeyRound,
  Wifi,
  WalletCards,
  Package,
  Map as MapIcon,
  Phone,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import rawCatalog from "./catalog.json";
import catalogTransitions from "./catalog-transitions.json";
import { localAnswer, searchCatalog } from "../server/catalog-search.mjs";

gsap.registerPlugin(ScrollTrigger);
const pagesDeployment = import.meta.env.VITE_DEPLOY_TARGET === "github-pages";
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");
if (
  configuredApiBase &&
  new URL(configuredApiBase).protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(new URL(configuredApiBase).hostname)
)
  throw new Error("AI endpoint must use HTTPS");
const apiBase = configuredApiBase;
const remoteGuide = Boolean(configuredApiBase) || !pagesDeployment;
const portalUrl = "https://info.jnu.edu.cn/";
type Entry = {
  id: string;
  title: string;
  category: string;
  summary: string;
  url: string;
  tags: string[];
  stages: string[];
  steps: string[];
  content: string[];
  links: { label: string; url: string }[];
  tables: { columns: string[]; rows: string[][]; caption?: string }[];
  image: string;
  imageAlt: string;
  imageCredit: string;
  notice: string;
  imageFit?: string;
  gallery: { image: string; alt: string; caption: string }[];
  sections: DetailSection[];
  relatedEntries: string[];
};
type DetailBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; items: string[] }
  | {
      type: "image";
      image: string;
      alt: string;
      caption: string;
      width?: number;
      height?: number;
    }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { type: "links"; items: { label: string; url: string }[] };
type DetailSection = { id: string; title: string; blocks: DetailBlock[] };
const catalog = rawCatalog as Entry[];
function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
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
    image: "images/clothes.jpg",
  },
  food: {
    title: "今天吃什么",
    short: "食",
    description: "校园美食与餐饮信息",
    color: "yellow",
    icon: Utensils,
    image: "images/food.jpg",
  },
  housing: {
    title: "安心住下来",
    short: "住",
    description: "宿舍、报修与生活用品",
    color: "blue",
    icon: House,
    image: "images/room.jpg",
  },
  travel: {
    title: "出发去看看",
    short: "行",
    description: "到校、地铁与返乡",
    color: "green",
    icon: Bike,
    image: "images/bike.jpg",
  },
  health: {
    title: "照顾好自己",
    short: "医",
    description: "健康、医保与学生支持",
    color: "purple",
    icon: HeartPulse,
    image: "images/health.jpg",
  },
  study: {
    title: "学习与办事",
    short: "学",
    description: "教务、图书馆与奖助",
    color: "blue",
    icon: BookOpen,
    image: "images/sections/study.webp",
  },
  career: {
    title: "走向下一站",
    short: "业",
    description: "实习、就业与权益保障",
    color: "green",
    icon: GraduationCap,
    image: "images/sections/career.webp",
  },
  account: {
    title: "校园账号",
    short: "号",
    description: "统一身份、邮箱与账户",
    color: "blue",
    icon: KeyRound,
    image: "images/sections/account.webp",
  },
  network: {
    title: "校园网络",
    short: "网",
    description: "联网、认证与网络报修",
    color: "purple",
    icon: Wifi,
    image: "images/sections/network.webp",
  },
  payment: {
    title: "学费与水电",
    short: "费",
    description: "学费、充值与水电缴费",
    color: "yellow",
    icon: WalletCards,
    image: "images/sections/payment.webp",
  },
  logistics: {
    title: "快递与收发",
    short: "递",
    description: "取件、寄件与收货地址",
    color: "pink",
    icon: Package,
    image: "images/sections/logistics.webp",
  },
  facilities: {
    title: "校园地图",
    short: "图",
    description: "楼宇、路线与校园设施",
    color: "green",
    icon: MapIcon,
    image: "images/sections/facilities.webp",
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
  | { page: "entry"; id: string }
  | { page: "ask" };
function readRoute(): Route {
  const hash = window.location.hash.slice(1);
  const [pathname, parameters] = hash.split("?");
  const query = new URLSearchParams(parameters);
  if (pathname?.startsWith("/entry/")) {
    const id = pathname.slice(7);
    const aliases = catalogTransitions.aliases as Record<string, string>;
    return { page: "entry", id: aliases[id] || id };
  }
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
function entryHref(id: string) {
  return `#/entry/${encodeURIComponent(id)}`;
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
}: {
  entry: Entry;
  onOpen: (entry: Entry) => void;
}) {
  return (
    <article
      className={`entry-card tone-${categories[entry.category].color}`}
      data-entry-id={entry.id}
    >
      <span className="entry-thumbnail">
        <img
          src={assetUrl(entry.image)}
          alt=""
          loading="lazy"
          width="560"
          height="315"
        />
        <span className="entry-image-category">
          <CategoryIcon category={entry.category} size={16} />
          {categories[entry.category].title}
        </span>
      </span>
      <span className="entry-card-body">
        <span className="entry-copy">
          <strong>
            <a href={entryHref(entry.id)}>{entry.title}</a>
          </strong>
          <span>{entry.summary}</span>
          <a
            className="entry-details-button"
            href={entryHref(entry.id)}
            aria-label={`查看详情：${entry.title}`}
          >
            查看详情 <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </span>
        <span className="entry-arrow">
          <ArrowUpRight size={19} aria-hidden="true" />
        </span>
      </span>
    </article>
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
function ServiceNotice() {
  return (
    <div className="source-note">
      <BookOpen size={19} aria-hidden="true" />
      <p>校园服务可能调整，具体时间、价格与办理方式请查看最新通知。</p>
      <a
        href="https://panyu.jnu.edu.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        校区通知
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
      <section className="home-hero home-hero-photo">
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
        <div className="hero-scene hero-campus-photo">
          <img
            src={assetUrl("images/campus/jnu-gate.jpg")}
            alt="蓝天映衬下的暨南大学校门，拱门上写有暨南大学与 JINAN UNIVERSITY"
            fetchPriority="high"
            width="1080"
            height="1441"
          />
          <div className="scene-caption">暨南大学 · 校门风景</div>
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
                  src={assetUrl(category.image)}
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
      <section
        className="section-block campus-service-section"
        aria-labelledby="services-heading"
      >
        <div className="section-heading">
          <div>
            <h2 id="services-heading">校园大小事，一站找到</h2>
            <p>账号、网络、缴费、快递，再到学习与成长。</p>
          </div>
          <a className="text-link" href={guideHref()}>
            浏览全部板块
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="service-category-grid">
          {Object.entries(categories)
            .slice(5)
            .map(([key, category]) => (
              <a
                key={key}
                href={guideHref(key)}
                className={`service-category-card tone-${category.color}`}
              >
                <div className="service-category-photo">
                  <img
                    src={assetUrl(category.image)}
                    alt=""
                    loading="lazy"
                    width="560"
                    height="315"
                  />
                  <span className="service-category-icon">
                    <CategoryIcon category={key} size={21} />
                  </span>
                </div>
                <div className="service-category-copy">
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </div>
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
              url: "https://scdc.jnu.edu.cn/",
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
        <ServiceNotice />
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
      {route.category === "facilities" && !route.query && <MapFeature />}
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
      <ServiceNotice />
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
      <ServiceNotice />
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
function connectionErrorMessage(problem: unknown) {
  if (problem instanceof Error) {
    if (problem.name === "TimeoutError")
      return "回答等待超时，请重试，或先使用站内检索查找指南。";
    if (/[\u3400-\u9fff]/.test(problem.message)) return problem.message;
  }
  return "网络未能连接校园向导，请重试，或先使用站内检索查找指南。";
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
  const [useLocal, setUseLocal] = useState(false);
  const [connection, setConnection] = useState<
    "checking" | "ready" | "offline"
  >(remoteGuide ? "checking" : "ready");
  const [failedQuestion, setFailedQuestion] = useState("");
  const usingRemote = remoteGuide && !useLocal;
  const controller = useRef<AbortController | null>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const sendLock = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const abort = new AbortController();
    if (!usingRemote) {
      setMode("local");
      setConnection("ready");
      return;
    }
    setConnection("checking");
    fetch(`${apiBase}/api/status`, {
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(6000)]),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((status) => {
        if (status.mode === "model" || status.mode === "local") {
          setMode(status.mode);
          setConnection("ready");
        } else {
          setConnection("offline");
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setConnection("offline");
      });
    return () => abort.abort();
  }, [usingRemote]);
  useEffect(() => {
    messageEnd.current?.scrollIntoView({
      behavior: reducedMotion() ? "instant" : "smooth",
      block: "nearest",
    });
  }, [messages, pending]);
  async function ask(text: string, retry = false, forceLocal = false) {
    const trimmed = text.trim();
    if (!trimmed || sendLock.current) return;
    sendLock.current = true;
    setQuestion("");
    setError("");
    setFailedQuestion("");
    setPending(true);
    const history = retry ? messages.slice(0, -1) : messages;
    if (!retry)
      setMessages((current) => [
        ...current,
        { id: Date.now(), role: "user", text: trimmed },
      ]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let result: unknown;
      if (usingRemote && !forceLocal) {
        const response = await fetch(`${apiBase}/api/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: history
              .slice(-6)
              .map((item) => ({ role: item.role, content: item.text })),
          }),
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(110000)]),
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
      if (!usingRemote || forceLocal || reply.mode === "model")
        setMode(reply.mode);
      setConnection("ready");
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: reply.answer, reply },
      ]);
    } catch (problem) {
      if (!abort.signal.aborted) {
        setError(connectionErrorMessage(problem));
        setFailedQuestion(trimmed);
        if (usingRemote && !forceLocal) setConnection("offline");
      }
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
          {usingRemote && connection === "checking"
            ? "正在连接 AI…"
            : usingRemote && connection === "offline"
              ? "AI 暂未连接"
              : mode === "model"
                ? "AI 校园向导"
                : "站内智能检索"}
        </span>
        <small>
          {usingRemote
            ? "结合站内指南回答，支持继续追问"
            : "根据已有资料寻找入口"}
        </small>
        {remoteGuide && useLocal && (
          <button
            className="chat-mode-button"
            type="button"
            disabled={pending}
            onClick={() => {
              setError("");
              setUseLocal(false);
            }}
          >
            尝试连接 AI
          </button>
        )}
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
                              <small>{categories[entry.category].title}</small>
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
            {usingRemote ? "正在阅读指南并整理回答…" : "正在查找相关入口…"}
          </div>
        )}
        <div ref={messageEnd} />
      </div>
      {(error || (usingRemote && connection === "offline")) && (
        <div className="chat-error" role="alert">
          <p>
            {error ||
              "校园向导暂时无法连接，你可以继续按分类查找，或使用站内检索。"}
          </p>
          <div className="chat-error-actions">
            {failedQuestion && (
              <button
                type="button"
                disabled={pending}
                onClick={() => void ask(failedQuestion, true)}
              >
                重试这个问题
              </button>
            )}
            {usingRemote && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setUseLocal(true);
                  setError("");
                  if (failedQuestion) void ask(failedQuestion, true, true);
                }}
              >
                使用站内检索
              </button>
            )}
          </div>
        </div>
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
        {!usingRemote || (connection === "ready" && mode === "local")
          ? "当前使用站内检索，不生成未核实的信息。"
          : "AI 根据站内指南回答，请核对服务的最新安排。"}
        点击条目可查看完整图文详情。
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
            <strong>把需要办的事，快速找到</strong>
            <p>告诉向导你的需求，查看对应分类、操作步骤与校园服务入口。</p>
          </div>
        </aside>
        <div className="full-chat">
          <Chat initialQuestion="" onOpen={onOpen} />
        </div>
      </div>
    </div>
  );
}
function ResourceText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(https:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+)/g)
        .map((part, index) =>
          part.startsWith("https://") ? (
            <a
              className="inline-resource"
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
            >
              {part}
            </a>
          ) : (
            part
          ),
        )}
    </>
  );
}
function DetailLinks({ links }: { links: { label: string; url: string }[] }) {
  return (
    <div className="detail-links">
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target={link.url.startsWith("http") ? "_blank" : undefined}
          rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {link.url.startsWith("tel:") ? (
            <Phone size={17} aria-hidden="true" />
          ) : link.url.startsWith("mailto:") ? (
            <Mail size={17} aria-hidden="true" />
          ) : (
            <ExternalLink size={17} aria-hidden="true" />
          )}
          <span>{link.label}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
function DetailPage({ id }: { id: string }) {
  const entry = catalog.find((item) => item.id === id);
  const [activeSection, setActiveSection] = useState("");
  const article = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!entry) {
      document.title = "指南暂不可用 · 番禺校园指南";
      return;
    }
    document.title = `${entry.title} · 番禺校园指南`;
    const sections =
      article.current?.querySelectorAll<HTMLElement>(".reading-section") || [];
    const observer = new IntersectionObserver(
      (items) => {
        const visible = items
          .filter((item) => item.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    setActiveSection(entry.sections[0]?.id || "");
    if (window.location.hash !== entryHref(entry.id))
      window.history.replaceState(
        window.history.state,
        "",
        entryHref(entry.id),
      );
    return () => {
      observer.disconnect();
      document.title = "番禺校园指南";
    };
  }, [entry]);
  if (!entry)
    return (
      <div className="inner-page detail-unavailable">
        <h1>这条指南暂不可用</h1>
        <p>相关内容已调整，请在生活指南中选择当前可用的服务。</p>
        <a href={guideHref()} className="primary-button">
          查看生活指南 <ChevronRight size={18} />
        </a>
      </div>
    );
  function goTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({
      behavior: reducedMotion() ? "instant" : "smooth",
      block: "start",
    });
    element?.focus({ preventScroll: true });
  }
  return (
    <div
      className={`inner-page reading-page ${entry.id === "pdf-campus-map" ? "map-reading-page" : ""}`}
    >
      <div className="reading-breadcrumb">
        <button
          className="back-link"
          onClick={() => {
            if (window.history.state?.campusNavigation) window.history.back();
            else window.location.hash = guideHref(entry.category);
          }}
        >
          <ChevronLeft size={17} aria-hidden="true" />
          返回
        </button>
        <a href={guideHref(entry.category)}>
          {categories[entry.category].title}
        </a>
        <ChevronRight size={15} aria-hidden="true" />
        <span>完整指南</span>
      </div>
      <header className="reading-header">
        <span className="location-label">
          <CategoryIcon category={entry.category} size={18} />
          {categories[entry.category].title}
        </span>
        <h1>{entry.title}</h1>
        <p>{entry.summary}</p>
        <div className="reading-actions">
          {entry.url && (
            <a
              className="primary-button"
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开服务入口 <ExternalLink size={17} aria-hidden="true" />
            </a>
          )}
          <button
            className="secondary-button"
            onClick={() => {
              const target = document.getElementById("reading-body");
              target?.scrollIntoView({
                behavior: reducedMotion() ? "instant" : "smooth",
              });
              target?.focus({ preventScroll: true });
            }}
          >
            阅读图文指南 <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </header>
      <figure
        className={`reading-cover ${entry.imageFit === "contain" ? "reading-cover-original" : ""}`}
      >
        <a
          href={assetUrl(entry.image)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`放大图片：${entry.imageAlt}`}
        >
          <img
            src={assetUrl(entry.image)}
            alt={entry.imageAlt}
            width="1320"
            height={entry.imageFit === "contain" ? "1225" : "740"}
          />
        </a>
        <figcaption>
          {entry.imageFit === "contain"
            ? "完整地图 · 点击查看原尺寸"
            : "主题场景配图 · 操作与位置图解见下文"}
        </figcaption>
      </figure>
      <div className="reading-layout">
        <aside className="reading-sidebar">
          <nav aria-label="本页目录">
            <strong>本页目录</strong>
            {entry.sections.map((section, i) => (
              <button
                key={section.id}
                className={activeSection === section.id ? "current" : ""}
                aria-current={
                  activeSection === section.id ? "location" : undefined
                }
                onClick={() => goTo(section.id)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </button>
            ))}
            {entry.links.length > 0 && (
              <button onClick={() => goTo("reading-links")}>
                联系与相关入口
              </button>
            )}
          </nav>
        </aside>
        <article
          id="reading-body"
          className="reading-body"
          tabIndex={-1}
          ref={article}
        >
          {entry.sections.map((section) => (
            <section
              id={section.id}
              key={section.id}
              className="reading-section"
              tabIndex={-1}
            >
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) => {
                if (block.type === "paragraph")
                  return (
                    <p key={index}>
                      <ResourceText text={block.text} />
                    </p>
                  );
                if (block.type === "steps")
                  return (
                    <ol key={index} className="detail-steps">
                      {block.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  );
                if (block.type === "image")
                  return (
                    <figure key={index} className="instruction-figure">
                      <a
                        href={assetUrl(block.image)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`放大图片：${block.alt}`}
                      >
                        <img
                          src={assetUrl(block.image)}
                          alt={block.alt}
                          width={block.width}
                          height={block.height}
                          loading="lazy"
                        />
                        <span className="image-expand">
                          <ExternalLink size={16} aria-hidden="true" />
                          放大查看
                        </span>
                      </a>
                      <figcaption>{block.caption}</figcaption>
                    </figure>
                  );
                if (block.type === "links")
                  return <DetailLinks links={block.items} key={index} />;
                return (
                  <div className="reading-table" key={index}>
                    <p className="detail-table-hint">
                      {block.caption} · 窄屏可左右滑动查看完整表格
                    </p>
                    <div
                      className="detail-table-scroll"
                      tabIndex={0}
                      role="region"
                      aria-label={block.caption || section.title}
                    >
                      <table>
                        <thead>
                          <tr>
                            {block.columns.map((column, i) => (
                              <th key={i} scope="col">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>
                                  <ResourceText text={cell} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
          {entry.links.length > 0 && (
            <section
              id="reading-links"
              className="reading-section"
              tabIndex={-1}
            >
              <h2>联系与相关入口</h2>
              <DetailLinks links={entry.links} />
            </section>
          )}
          <div className="detail-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>办理提醒</strong>
              <p>{entry.notice}</p>
            </div>
          </div>
        </article>
      </div>
      <section className="related-guides">
        <h2>继续了解相关服务</h2>
        <div className="entries-grid">
          {entry.relatedEntries
            .map((relatedId) => catalog.find((item) => item.id === relatedId))
            .filter((item): item is Entry => Boolean(item))
            .map((item) => (
              <EntryCard key={item.id} entry={item} onOpen={() => {}} />
            ))}
        </div>
      </section>
    </div>
  );
}
function MapFeature() {
  return (
    <a className="map-feature" href={entryHref("pdf-campus-map")}>
      <img
        src={assetUrl("images/campus/panyu-location-map.jpg")}
        alt="番禺校区新版地图：T1–T20、教学楼、图书馆与校医室"
        width="1320"
        height="1225"
        loading="lazy"
      />
      <div>
        <span className="location-label">
          <MapIcon size={19} aria-hidden="true" />
          校园地图
        </span>
        <h2>先找到你要去的地方</h2>
        <p>宿舍、食堂、教学楼、校医室与校门，一张完整地图看清位置。</p>
        <span className="primary-button">
          查看完整地图 <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </div>
    </a>
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
      window.history.replaceState({ campusNavigation: true }, "");
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
          ".category-card, .service-category-card, .entry-card, .journey-card",
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
    document.body.style.overflow = assistant.open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [assistant.open]);
  function ask(question: string) {
    setAssistant({ open: true, question });
  }
  function openEntry(next: Entry) {
    window.location.hash = entryHref(next.id);
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
            aria-label={menuOpen ? "收起导航" : "展开导航"}
            aria-controls="main-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
          <nav
            id="main-navigation"
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
              href={entryHref("pdf-campus-map")}
              className={
                route.page === "entry" && route.id === "pdf-campus-map"
                  ? "active"
                  : ""
              }
            >
              校园地图
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
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            校园服务
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
        ) : route.page === "entry" ? (
          <DetailPage key={route.id} id={route.id} />
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
          <a
            href="https://www.jnu.edu.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            暨南大学官网
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
          <small>主题照片为场景配图；位置与操作图解可在完整指南中查看。</small>
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
    </>
  );
}
