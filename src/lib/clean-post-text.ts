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

  // HTML 엔티티 디코드 — BAND가 본문 안 특수문자를 &lt; &gt; &amp; 등으로 인코딩해서 줌.
  // React는 텍스트 노드에서 이걸 자동 디코드 안 하므로 사전 디코드 필요.
  // 순서: &amp;를 마지막에 둬서 &amp;lt; → &lt; → < 같은 이중 디코드 막음.
  t = t
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  // 디코드 후 드러나는 섹션 마커 태그 — <REMARK>, <NOTICE> 같이 모두 대문자(밑줄 허용) 형태만.
  // 일반 HTML 태그(소문자 등)는 건드리지 않음.
  t = t.replace(/<\/?[A-Z][A-Z_]+>/g, "");

  // 빈 줄 정리: 3줄 이상 연속 개행 → 2줄
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return t.trim();
}
