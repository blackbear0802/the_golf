// 게시글 본문에서 Word 필드코드(HYPERLINK)·깨진 band.us 미디어 링크 등 노이즈 제거
// 표시·AI 파싱·저장 공용. 연락처 제거(stripContacts)와는 별개 관심사.

export function cleanPostText(input: string | null | undefined): string {
  if (!input) return "";
  let t = input;

  // Word 하이퍼링크 필드코드: HYPERLINK "..." ( \* MERGEFORMAT 꼬리 포함 )
  t = t.replace(/HYPERLINK\s+"[^"]*"(\s*\\\*\s*MERGEFORMAT)?/gi, "");

  // 단독 band.us 페이지/미디어/해시태그 링크 줄 (이미지 자리표시·깨진 참조)
  t = t.replace(/^\s*https?:\/\/(?:www\.)?band\.us\/[^\s]*\s*$/gim, "");

  // 밴드 첨부 placeholder 태그 — <band:attachment type="photo" id="..." /> 형태로 본문 안에 박혀 옴
  // 실제 이미지·동영상은 API의 photos/videos 배열로 별도 전달되므로 본문에선 제거.
  t = t.replace(/<band:[a-z]+\b[^>]*\/?>(?:<\/band:[a-z]+>)?/gi, "");

  // 빈 줄 정리: 3줄 이상 연속 개행 → 2줄
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return t.trim();
}
