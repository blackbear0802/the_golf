// 이미지 URL/캡션/주변 텍스트의 키워드로 카테고리(golf/accommodation/dining) 추정
// 1차는 키워드 기반. 정확도가 낮으면 향후 LLM 호출로 교체 가능.

const KEYWORDS: Record<"golf" | "accommodation" | "dining", string[]> = {
  golf: [
    "골프", "코스", "그린", "페어웨이", "티박스", "벙커", "라운드", "홀",
    "golf", "course", "fairway", "green", "hole", "tee", "bunker",
  ],
  accommodation: [
    "호텔", "리조트", "객실", "수영장", "로비", "스파", "방", "침대",
    "hotel", "resort", "room", "pool", "lobby", "spa", "suite",
  ],
  dining: [
    "식당", "레스토랑", "조식", "뷔페", "요리", "식사", "메뉴", "음식",
    "restaurant", "menu", "buffet", "dining", "breakfast", "lunch", "dinner", "food",
  ],
};

export type ImageCategory = "golf" | "accommodation" | "dining";

export function classifyImage(
  url: string,
  caption: string | null,
  context: string
): ImageCategory {
  const haystack = `${url} ${caption ?? ""} ${context}`.toLowerCase();
  const scores: Record<ImageCategory, number> = { golf: 0, accommodation: 0, dining: 0 };

  for (const cat of Object.keys(KEYWORDS) as ImageCategory[]) {
    for (const w of KEYWORDS[cat]) {
      if (haystack.includes(w.toLowerCase())) scores[cat] += 1;
    }
  }

  const ranked = (Object.entries(scores) as [ImageCategory, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  // 최고 점수가 0이면 기본값 golf (대부분 골프 사진)
  return ranked[0][1] > 0 ? ranked[0][0] : "golf";
}
