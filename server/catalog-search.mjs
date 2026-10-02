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
};
const categoryLabels = {
  clothes: "衣物护理",
  food: "校园饮食",
  housing: "宿舍生活",
  travel: "出行交通",
  health: "医疗健康",
  study: "校园办事",
  career: "毕业与就业",
};
export function searchCatalog(query, catalog) {
  const normalized = query.trim().toLowerCase();
  const housingFault =
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
      const titleScore =
        normalized.includes(entry.title) || entry.title.includes(normalized)
          ? 7
          : 0;
      const categoryScore = relatedCategories.includes(entry.category) ? 2 : 0;
      const phraseScore =
        normalized.length >= 2 && entry.summary.includes(normalized) ? 2 : 0;
      return {
        entry,
        score:
          tagScore +
          titleScore +
          categoryScore +
          phraseScore +
          (housingFault && entry.id === "repair" ? 8 : 0),
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
  return {
    mode: "local",
    answer: `找到了与${labels}相关的入口。点击下方条目可以查看办理线索，再打开对应来源。具体地点、时间和要求请以来源最新说明为准。`,
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
