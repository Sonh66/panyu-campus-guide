const categoryWords = {
  clothes: ["衣服", "洗衣", "穿搭", "换季", "衣物"],
  food: [
    "吃饭",
    "好吃",
    "食堂",
    "餐饮",
    "吃什么",
    "吃的",
    "美食",
    "奶茶",
    "咖啡",
  ],
  housing: ["宿舍", "住宿", "住哪", "空调", "维修", "报修", "寝室"],
  travel: [
    "出行",
    "交通",
    "去哪",
    "地铁",
    "高铁",
    "路线",
    "返乡",
    "回家",
    "到校",
  ],
  health: ["生病", "看病", "医疗", "医保", "体检", "医院", "发烧", "心理"],
  study: ["入学", "新生", "报到", "学习", "图书馆", "课程", "助学"],
  career: ["毕业", "就业", "实习", "招聘", "离校", "档案", "合同", "租房"],
  account: ["账号", "密码", "激活", "jnuid", "统一身份", "服务号", "校园卡"],
  network: [
    "校园网",
    "网络",
    "联网",
    "wifi",
    "无线",
    "有线",
    "锐捷",
    "端口",
    "mynet",
  ],
  payment: ["缴费", "学费", "学杂费", "财务", "充值", "水电费", "电费", "水费"],
  logistics: ["快递", "收件", "收货", "寄件", "包裹", "收件地址"],
  facilities: [
    "校园地图",
    "楼宇",
    "操场",
    "体育馆",
    "游泳馆",
    "超市",
    "商业城",
  ],
};
const categoryLabels = {
  clothes: "衣物护理",
  food: "校园饮食",
  housing: "宿舍生活",
  travel: "出行交通",
  health: "医疗健康",
  study: "校园办事",
  career: "毕业与就业",
  account: "校园账号",
  network: "校园网络",
  payment: "缴费充值",
  logistics: "快递收发",
  facilities: "校园地图",
};
export function searchCatalog(query, catalog) {
  const normalized = query.trim().toLowerCase();
  const networkQuery = categoryWords.network.some((word) =>
    normalized.includes(word),
  );
  const faultQuery = [
    "坏",
    "故障",
    "维修",
    "报修",
    "断网",
    "连不上",
    "无法连接",
  ].some((word) => normalized.includes(word));
  const housingFault =
    !networkQuery &&
    ["宿舍", "空调", "漏水", "水电", "寝室"].some((word) =>
      normalized.includes(word),
    ) &&
    ["坏", "故障", "漏水", "维修", "报修"].some((word) =>
      normalized.includes(word),
    );
  if (!normalized) return [];
  const relatedCategories = Object.entries(categoryWords)
    .filter(([, words]) => words.some((word) => normalized.includes(word)))
    .map(([category]) => category);
  return catalog
    .map((entry) => {
      const tagScore = entry.tags.reduce(
        (score, tag) =>
          score +
          (normalized.includes(tag.toLowerCase())
            ? tag.length > 1
              ? 4
              : 1
            : 0),
        0,
      );
      const title = entry.title.toLowerCase();
      const titleScore =
        normalized.includes(title) || title.includes(normalized) ? 7 : 0;
      const categoryScore = relatedCategories.includes(entry.category) ? 2 : 0;
      const body = [
        entry.summary,
        ...(entry.content || []),
        ...entry.steps,
        ...(entry.tables || []).flatMap((table) => table.rows.flat()),
      ]
        .join(" ")
        .toLowerCase();
      const phraseScore =
        normalized.length >= 2 && body.includes(normalized) ? 3 : 0;
      return {
        entry,
        score:
          tagScore +
          titleScore +
          categoryScore +
          phraseScore +
          (housingFault && entry.id === "repair" ? 8 : 0) +
          (networkQuery &&
          faultQuery &&
          entry.id === "pdf-campus-network-repair"
            ? 16
            : 0),
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((match) => match.entry);
}
export function localAnswer(query, catalog) {
  const recommendations = searchCatalog(query, catalog).slice(0, 4);
  if (recommendations.length === 0)
    return {
      mode: "local",
      answer:
        "目前的站内资料没有匹配到这个问题。可以换成具体需求，例如“宿舍报修”“新生报到”或“找实习”，也可以打开原文攻略继续查找。",
      recommendations: [],
      categories: [],
    };
  const categories = [
    ...new Set(recommendations.map((entry) => entry.category)),
  ];
  const labels = categories
    .map((category) => categoryLabels[category])
    .join("、");
  const first = recommendations[0];
  const evidence =
    first.sourceState === "pdf"
      ? `《番禺校区攻略》PDF 第 ${first.sourcePages.join("、")} 页：${first.summary}`
      : first.summary;
  return {
    mode: "local",
    answer: `找到${labels}相关资料。${evidence}\n点击下方条目查看完整步骤、图片和来源。原攻略中的时间、价格与营业状态是历史信息，请核对学校或商家的最新说明。`,
    recommendations: recommendations.map((entry) => entry.id),
    categories,
  };
}
export function validateModelAnswer(response, catalog) {
  if (
    !response ||
    typeof response !== "object" ||
    typeof response.answer !== "string" ||
    !response.answer.trim() ||
    response.answer.length > 3000 ||
    !Array.isArray(response.recommendations)
  )
    throw new Error("Model returned an invalid response");
  const allowed = new Set(catalog.map((entry) => entry.id));
  if (
    response.recommendations.length > 5 ||
    response.recommendations.some(
      (id) => typeof id !== "string" || !allowed.has(id),
    )
  )
    throw new Error("Model returned an unknown catalog destination");
  const recommendations = [...new Set(response.recommendations)];
  const categories = [
    ...new Set(
      catalog
        .filter((entry) => recommendations.includes(entry.id))
        .map((entry) => entry.category),
    ),
  ];
  return {
    mode: "model",
    answer: response.answer,
    recommendations,
    categories,
  };
}
